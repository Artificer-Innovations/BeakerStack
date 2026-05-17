# Preview & Staging Access Control

By default, PR preview and staging deployments are publicly accessible — anyone with the URL can view them. For teams that need to restrict access to internal stakeholders, Beaker Stack supports **CloudFront signed cookies**.

## How it works

Access control is enforced at the CloudFront edge using [signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html). The mechanism is:

1. **Setup (once):** An RSA key pair is provisioned. The public key is registered with CloudFront; the private key is stored as a GitHub Actions secret.
2. **CI at deploy time:** The workflow signs a custom policy document (specifying the resource URL and expiry) using the private key. This produces pre-computed cookie values — no crypto happens at request time.
3. **Bootstrap URL:** The signed cookie values are embedded in a short-lived bootstrap link (`/_preview-auth?policy=...&sig=...&kid=...`) that CI posts to the PR comment and GitHub Deployments.
4. **First visit:** The stakeholder clicks the bootstrap link. A CloudFront Function reads the cookie values from the query string and returns a 302 response that sets all three `CloudFront-*` cookies on the browser.
5. **Subsequent requests:** Every request to the preview domain carries the signed cookies. CloudFront validates the RSA-SHA1 signature at the edge and serves the content. Unsigned requests receive a 403.

### Critical: two-behavior cache configuration

The `/_preview-auth` path uses a **separate cache behavior** with no `TrustedKeyGroups`. This is required — without it, unauthenticated users cannot reach the cookie setter to acquire their cookies. The default behavior (all other paths) is where enforcement is applied.

```
/_preview-auth   → CacheBehavior: PreviewAuthFunction, NO TrustedKeyGroups
/*               → DefaultCacheBehavior: PRPathRouter/SPAFallback, TrustedKeyGroups enforced
```

## Quick start

### Prerequisites

- AWS credentials with the IAM permissions listed below
- `gh` CLI authenticated to your GitHub repo
- `aws`, `openssl`, and `jq` in PATH

### Enable signed cookies for PR previews

```bash
./scripts/pr-preview/setup-signed-cookies.sh \
  --stack-name "${PR_PREVIEW_STACK_NAME}" \
  --domain "${PR_PREVIEW_DOMAIN}" \
  --enable-preview
```

### Enable signed cookies for both PR previews and staging

```bash
./scripts/pr-preview/setup-signed-cookies.sh \
  --stack-name "${PR_PREVIEW_STACK_NAME}" \
  --domain "${PR_PREVIEW_DOMAIN}" \
  --enable-preview \
  --enable-staging
```

The script:

1. Generates an RSA-2048 key pair
2. Uploads the public key to CloudFront and retrieves its ID
3. Updates the CloudFormation stack (`PreviewAccessControl`, `StagingAccessControl`, `CloudFrontSigningPublicKeyId` parameters) — this creates the key group and applies `TrustedKeyGroups` to the appropriate distributions
4. Writes `CLOUDFRONT_SIGNING_KEY` and `CLOUDFRONT_SIGNING_KEY_ID` to GitHub Actions secrets

CloudFront distribution updates take **5–10 minutes** to propagate globally.

### Use an existing private key

If you've already generated a key pair for another reason:

```bash
./scripts/pr-preview/setup-signed-cookies.sh \
  --stack-name "${PR_PREVIEW_STACK_NAME}" \
  --domain "${PR_PREVIEW_DOMAIN}" \
  --enable-preview \
  --private-key /path/to/private-key.pem
```

## CloudFormation parameters

The following parameters control access on the shared infrastructure stack (`infra/aws/pr-preview-stack.yml`):

| Parameter                      | Values                     | Default  | Description                                                        |
| ------------------------------ | -------------------------- | -------- | ------------------------------------------------------------------ |
| `PreviewAccessControl`         | `public`, `signed-cookies` | `public` | Access mode for PR preview (deploy) distribution                   |
| `StagingAccessControl`         | `public`, `signed-cookies` | `public` | Access mode for staging distribution                               |
| `CloudFrontSigningPublicKeyId` | string                     | `''`     | CloudFront public key ID; required when either is `signed-cookies` |

## GitHub Actions secrets

Two optional secrets control CI signing behavior:

| Secret                      | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `CLOUDFRONT_SIGNING_KEY`    | RSA private key PEM. Set by `setup-signed-cookies.sh`.      |
| `CLOUDFRONT_SIGNING_KEY_ID` | CloudFront public key ID. Set by `setup-signed-cookies.sh`. |

When these secrets are absent, CI skips cookie signing and posts plain URLs (public mode). No workflow change is needed when switching modes — the presence of the secrets determines behavior.

## Cookie details

Three cookies are set on the preview domain:

| Cookie                   | Description                                                   |
| ------------------------ | ------------------------------------------------------------- |
| `CloudFront-Policy`      | Base64-encoded custom policy (resource + expiry)              |
| `CloudFront-Signature`   | RSA-SHA1 signature of the policy, signed with the private key |
| `CloudFront-Key-Pair-Id` | CloudFront public key ID, used to locate the verification key |

All cookies use `HttpOnly; Secure; SameSite=Lax; Path=/`. `SameSite=Lax` allows cookies to be sent on top-level cross-site navigation (clicking a link from a GitHub PR comment).

**Cookie TTL:**

- PR previews: 7 days
- Staging: 30 days

**Signing algorithm:** RSA-SHA1 with CloudFront URL-safe base64 encoding (`+→-`, `/→~`, `=→_`). This is required by CloudFront's signed cookie specification — SHA-256 is not supported.

**Custom policy vs canned policy:** This implementation uses `--custom-policy` (not the default canned policy). A custom policy is required for wildcard resource matching (e.g., `https://deploy.example.com/pr-42/*`). The canned policy only supports exact resource URLs.

## IAM permissions

The IAM credentials used by `setup-signed-cookies.sh` require:

```json
{
  "Effect": "Allow",
  "Action": [
    "cloudfront:CreatePublicKey",
    "cloudformation:DescribeStacks",
    "cloudformation:CreateChangeSet",
    "cloudformation:DescribeChangeSet",
    "cloudformation:ExecuteChangeSet",
    "cloudformation:GetTemplateSummary"
  ],
  "Resource": "*"
}
```

The following are executed **indirectly via CloudFormation** (not by the script directly):

- `cloudfront:CreateKeyGroup` — creates the `PreviewSigningKeyGroup` resource
- `cloudfront:UpdateDistribution` — applies `TrustedKeyGroups` to distributions
- `cloudfront:CreateFunction` / `cloudfront:UpdateFunction` / `cloudfront:PublishFunction` — manages the `PreviewAuthFunction` CloudFront Function

The CI workflows (PR preview and staging deploy) only need:

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` for S3 deploy and CloudFront invalidation
- `CLOUDFRONT_SIGNING_KEY` / `CLOUDFRONT_SIGNING_KEY_ID` for cookie signing (no AWS calls needed for signing)

## How stakeholders access the preview

After a PR preview deploy, CI posts the bootstrap URL to:

1. **PR comment** — tagged with `<!-- pr-preview-links -->`, updated on each push
2. **GitHub Deployments** — visible in the PR's "Deployments" section and the repo's Environments tab

After a staging deploy, CI posts to:

1. **GitHub Deployments** — `staging` environment, updated on each merge to `develop`
2. **Actions run summary** — visible directly in the workflow run without navigating to Environments

**Access flow:**

1. Stakeholder clicks the bootstrap link from GitHub
2. Browser hits `/_preview-auth?policy=...&sig=...&kid=...&dest=/pr-42/`
3. CloudFront Function sets all three cookies and redirects to `dest`
4. All subsequent requests to the domain carry the signed cookies
5. CloudFront validates at the edge — no application-layer auth needed

## Disabling signed cookies

To revert to public access:

1. Update the CloudFormation stack parameters to `PreviewAccessControl=public` and/or `StagingAccessControl=public`:

   ```bash
   aws cloudformation deploy \
     --template-file infra/aws/pr-preview-stack.yml \
     --stack-name "${PR_PREVIEW_STACK_NAME}" \
     --no-fail-on-empty-changeset \
     --parameter-overrides \
       "PreviewAccessControl=public" \
       "StagingAccessControl=public"
   ```

2. Remove the GitHub secrets `CLOUDFRONT_SIGNING_KEY` and `CLOUDFRONT_SIGNING_KEY_ID`.

3. Optionally delete the CloudFront public key from the AWS console (CloudFront → Public keys).

## Future access control modes

The `PreviewAccessControl` and `StagingAccessControl` parameters are designed for future expansion. Values reserved for future use:

- `basic-auth` — HTTP Basic Auth via Lambda@Edge (not yet implemented)
- `platform-auth` — SSO/OIDC integration (not yet implemented)

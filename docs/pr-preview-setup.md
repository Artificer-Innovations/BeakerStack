# PR Preview Environment Setup

This guide explains how to provision, configure, and operate the automated pull
request preview workflow. It covers infrastructure resources (AWS), database
management (Supabase), mobile deployments (Expo EAS), CI/CD configuration, and
troubleshooting steps.

## Overview

Each pull request receives isolated previews for the web and mobile apps:

- **Web:** `https://pr-<number>.<domain>` served via CloudFront + S3.
- **Mobile:** Expo EAS Update channel `pr-<number>` published from the monorepo.
- **Database:** Supabase preview project reset to the target branch state.

Automation lives in `.github/workflows/pr-preview-environment.yml`, which calls
the helper scripts under `scripts/pr-preview/`.

## Prerequisites

### Accounts & Services

| Service      | Description                                            | Notes                                                                                                               |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **AWS**      | Hosts S3 bucket, CloudFront distribution, Route53 DNS. | Requires ability to create CloudFormation stacks and manage ACM certificates.                                       |
| **Supabase** | Dedicated preview project for PR data.                 | Service role password and API access token required.                                                                |
| **Expo**     | Expo EAS Update for mobile previews.                   | Requires `EXPO_TOKEN` with channel + update permissions and the Expo project’s **Project ID** (Settings → General). |

### CLI Tooling (CI)

All tools are installed automatically in the workflow, but when running
locally ensure the following are available:

- `aws` CLI v2
- `supabase` CLI ≥ 2.54.11
- `psql` (PostgreSQL client) for teardown
- `npx` (Node.js ≥ 18)
- `jq` (JSON parsing in scripts)

## Infrastructure Provisioning

1. **Wildcard Certificate**
   - Issue an ACM certificate in `us-east-1` that covers `<domain>` and
     `*.<domain>`.
   - Example: `beakerstack.com`, `*.beakerstack.com`.

2. **DNS Hosted Zone**
   - Ensure Route53 manages the hosted zone for the domain.
   - Wildcard record (`*.domain`) must point to the CloudFront distribution.

3. **Deploy CloudFormation Stack**
   - Use `infra/aws/pr-preview-stack.yml`.
   - Parameters:
     | Parameter | Example | Notes |
     | --- | --- | --- |
     | `DomainName` | `beakerstack.com` | Apex domain |
     | `HostedZoneId` | `Z0123456789` | Route53 hosted zone ID |
     | `CertificateArn` | `arn:aws:acm:us-east-1:...` | Wildcard cert |
     | `WebsiteBucketName` | _(optional)_ | Leave blank for auto |
     | `LogsBucketName` | _(optional)_ | Leave blank for auto |
     | `PreviewPrefix` | `pr-` | Used for subdomains and S3 folders |
     | `ProductionPrefix` | `production` | Root folder for prod |
   - Outputs used later:
     - `WebsiteBucketName`
     - `CloudFrontDistributionId`
     - `CloudFrontDomainName`
     - `CloudFrontFunctionArn`

4. **Verify CloudFront Function**
   - The stack deploys `SubdomainFolders` CloudFront Function to map
     `pr-123.domain → /pr-123/index.html`.
   - `infra/aws/functions/SubdomainFolders.js` contains the logic.

## Secrets & Variables

Configure repository **Secrets** and **Variables** (Settings → Secrets and
variables → Actions) before enabling the workflow.

### Secrets

| Secret                         | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`            | Deployer credentials (CloudFormation, S3, CloudFront).   |
| `AWS_SECRET_ACCESS_KEY`        | Matches above.                                           |
| `AWS_SESSION_TOKEN`            | Optional if using temporary credentials.                 |
| `PR_PREVIEW_CERTIFICATE_ARN`   | ACM certificate ARN (`us-east-1`).                       |
| `SUPABASE_PREVIEW_PROJECT_REF` | Target Supabase project ref (dedicated preview project). |
| `SUPABASE_PREVIEW_DB_PASSWORD` | Database password for the preview project.               |
| `SUPABASE_PREVIEW_DB_URL`      | Connection URI (used for teardown schema drop).          |
| `SUPABASE_ACCESS_TOKEN`        | Supabase personal access token (CLI authentication).     |
| `PREVIEW_SUPABASE_URL`         | Supabase API URL (Settings → API → Project URL).         |
| `PREVIEW_SUPABASE_ANON_KEY`    | Supabase anon key (Settings → API → anon public key).    |
| `EXPO_TOKEN`                   | Expo access token with Update + Channel permissions.     |

### Variables

| Variable                    | Description                                        | Example                                |
| --------------------------- | -------------------------------------------------- | -------------------------------------- |
| `PR_PREVIEW_DOMAIN`         | Root domain for previews.                          | `beakerstack.com`                      |
| `PR_PREVIEW_HOSTED_ZONE_ID` | Route53 zone ID.                                   | `Z0123456789`                          |
| `PR_PREVIEW_STACK_NAME`     | CloudFormation stack name.                         | `beakerstack-pr-preview`               |
| `PR_PREVIEW_PREFIX`         | Web/mobile preview prefix.                         | `pr-`                                  |
| `PR_PRODUCTION_PREFIX`      | Production path in S3.                             | `production`                           |
| `PR_PREVIEW_AWS_REGION`     | AWS region for stack.                              | `us-east-1`                            |
| `EXPO_ACCOUNT`              | Expo account slug.                                 | `artificerinnovations`                 |
| `EXPO_PROJECT_SLUG`         | Expo project slug.                                 | `beaker-stack`                         |
| `EXPO_PROJECT_ID`           | Expo project ID (Settings → General → Project ID). | `00000000-0000-0000-0000-000000000000` |

## Workflow Behaviour

The workflow `.github/workflows/pr-preview-environment.yml` runs on PR events.

### Deploy (`deploy-preview` job)

Triggered for `opened`, `reopened`, `synchronize`, `ready_for_review`.

1. Install dependencies and Supabase CLI.
2. Configure AWS credentials.
3. Run `scripts/pr-preview/bootstrap-aws-stack.sh`
   - Validates CloudFormation template.
   - Ensures CloudFront Function is published.
   - Syncs shared error page and exports outputs.
4. Run `scripts/pr-preview/reset-preview-database.sh`
   - Links to preview Supabase project.
   - Resets migrations + seed data.
   - Generates TypeScript types for all packages.

5. Run `scripts/pr-preview/deploy-web.sh`
   - Builds Vite web app.
   - Syncs to `s3://bucket/pr-<number>/`.
   - Invalidates CloudFront path `/pr-<number>/*`.
   - Performs `curl` check on `https://pr-<number>.<domain>/`.
6. Run `scripts/pr-preview/deploy-mobile.sh`
   - Ensures Expo branch + channel `pr-<number>`.
   - Publishes EAS Update.
   - Retrieves preview URLs.
7. Post/update PR comment with preview links.

### Teardown (`teardown-preview` job)

Triggered when a PR is `closed` (merged or abandoned).

1. Reads stack outputs for bucket/distribution.
2. Runs `scripts/pr-preview/teardown.sh`:
   - Deletes S3 prefix for the PR.
   - Creates CloudFront invalidation for `/pr-<number>/*`.
   - Drops Supabase schema `preview_pr_<number>` (if DB URL provided).
   - Removes Expo channel/branch (requires `EXPO_TOKEN`).

## Helper Scripts

| Script                      | Purpose                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `bootstrap-aws-stack.sh`    | Deploys/validates CloudFormation stack and exports outputs.          |
| `reset-preview-database.sh` | Resets Supabase preview project (migrations, seeds, types).          |
| `deploy-web.sh`             | Builds web app, uploads to S3, invalidates CloudFront, verifies URL. |
| `deploy-mobile.sh`          | Publishes Expo EAS update to PR-specific channel.                    |
| `teardown.sh`               | Deletes S3 prefix, CloudFront cache, Supabase schema, Expo channel.  |

All scripts support `--dry-run` and write outputs to `GITHUB_OUTPUT` (CI) or
`--env-file` (local usage).

## Local Testing

1. **Bootstrap stack**

   ```bash
   ./scripts/pr-preview/bootstrap-aws-stack.sh \
     --stack-name beakerstack-pr-preview \
     --region us-east-1 \
     --domain beakerstack.com \
     --hosted-zone-id Z0123456789 \
     --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/... \
     --dry-run
   ```

2. **Reset database**

   ```bash
   SUPABASE_ACCESS_TOKEN=... \
   ./scripts/pr-preview/reset-preview-database.sh \
     --project-ref your-preview-ref \
     --db-password your-db-password \
     --pr-number 123 \
     --dry-run
   ```

3. **Deploy web preview**

   ```bash
   ./scripts/pr-preview/deploy-web.sh \
     --pr-number 123 \
     --bucket your-preview-bucket \
     --distribution-id EDFDVBD6EXAMPLE \
     --domain beakerstack.com \
     --dry-run
   ```

4. **Publish Expo update**

   If `.eas/project.json` is missing, run `npx eas-cli init --id <Expo project ID>` inside `apps/mobile` first.

   ```bash
   EXPO_TOKEN=... \
   ./scripts/pr-preview/deploy-mobile.sh \
     --pr-number 123 \
     --expo-account artificerinnovations \
     --expo-project beaker-stack \
     --dry-run
   ```

5. **Teardown resources**
   ```bash
   ./scripts/pr-preview/teardown.sh \
     --pr-number 123 \
     --bucket your-preview-bucket \
     --distribution-id EDFDVBD6EXAMPLE \
     --supabase-db-url postgres://user:pass@db.supabase.co:5432/postgres \
     --expo-account artificerinnovations \
     --expo-project beaker-stack \
     --dry-run
   ```

## Troubleshooting

### CloudFront / S3 Issues

- **Preview URL returns 403/404**  
  Check CloudFront invalidation progress. Propagation can take up to 10 minutes.

- **Unexpected production content**  
  Ensure `SubdomainFolders` function deployed with latest code. Redeploy using
  `bootstrap-aws-stack.sh`.

- **Missing SSL certificate**  
  Confirm ACM certificate is issued in `us-east-1` and CloudFront distribution
  references the exact ARN.

### Supabase Issues

- **CLI prompts for login**  
  Provide `SUPABASE_ACCESS_TOKEN` secret.
- **Reset fails due to schema differences**  
  Ensure migrations and seeds align with preview project. Review CLI logs uploaded
  as GitHub Actions artifacts.

### Expo EAS Issues

- **`EXPO_TOKEN` missing permissions**  
  Token must allow channel creation and updates. Regenerate with appropriate role.
- **Update not visible**  
  Visit Expo Update dashboard (URL in PR comment) to verify status. Ensure Expo
  project slug/account match secrets.
- **Channel removal failure during teardown**  
  The script logs warnings but continues. Stale channels can be deleted manually:
  `EXPO_TOKEN=... npx --yes eas-cli channel:delete pr-123`.

### Workflow Failures

Artifacts and logs are attached to the run. Key files to inspect:

- `preview-bootstrap.env` (optional) – CloudFormation outputs.
- Supabase CLI logs (`.supabase/logs`).
- `ci/comment.md` for coverage summary (if tests run earlier).

Re-run jobs using GitHub Actions UI after addressing configuration issues.

## Maintenance & Extension

- **Cache policy tuning:** adjust `deploy-web.sh` cache headers for hashed assets.
- **Secrets rotation:** rotate AWS, Supabase, Expo credentials periodically.
- **Cleanup retention:** schedule periodic runs of `teardown.sh` for stale PRs.
- **Monitoring:** enable AWS S3/CloudFront access logs (already configured) and
  integrate with monitoring stack if desired.

## Validation Checklist

Use this list whenever you update the preview tooling:

1. **CloudFormation dry-run** – `./scripts/pr-preview/bootstrap-aws-stack.sh --dry-run` should exit cleanly.
2. **Supabase reset** – `reset-preview-database.sh --dry-run` should complete without mutating data. Use `--no-seed` if seeds take a long time.
3. **Web deploy** – Run `deploy-web.sh --dry-run` to confirm bucket + distribution parameters resolve, then run a live upload to a throwaway PR prefix and confirm invalidation.
4. **Expo update** – Publish to a test channel (e.g., `sandbox-pr`) and verify the update appears in the Expo dashboard.
5. **Teardown** – Execute `teardown.sh --dry-run` and inspect logged actions; follow with a real teardown to ensure S3 prefixes and channels disappear.
6. **Workflow rehearsal** – Trigger the GitHub Actions workflow on a draft PR. Validate that the comment posts links and that cleanup runs when the PR is closed.
7. **Regression tests** – Run `npm run lint`, `npm run type-check`, and `npm test` to confirm the monorepo remains green.

## References

- AWS CloudFront Function docs: <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html>
- Supabase CLI docs: <https://supabase.com/docs/reference/cli>
- Expo EAS Update docs: <https://docs.expo.dev/eas-update/introduction/>

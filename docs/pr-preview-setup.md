# PR Preview Environment Setup

This guide explains how to provision, configure, and operate the automated pull
request preview workflow. It covers infrastructure resources (AWS), database
management (Supabase), mobile deployments (Expo EAS), CI/CD configuration, and
troubleshooting steps.

## Overview

The infrastructure supports three environments:

- **Production:** `https://<domain>` (e.g., `https://beakerstack.com`)
- **Staging:** `https://staging.<domain>` (e.g., `https://staging.beakerstack.com`)
- **Previews:** `https://deploy.<domain>/pr-<number>/` (e.g., `https://deploy.beakerstack.com/pr-123/`)

Each pull request receives an isolated web preview deployment:

- **Web:** `https://deploy.<domain>/pr-<number>/` served via CloudFront + S3 using path-based routing.
- **Database:** Supabase preview project reset to the target branch state.
- **Mobile:** When `EXPO_TOKEN`, `EXPO_PROJECT_ID`, and the `EXPO_ACCOUNT` repository variable are configured, the workflow publishes an EAS update on a PR-specific preview channel (see deploy steps in the workflow file).

Automation lives in `.github/workflows/pr-preview-environment.yml`, which calls
the helper scripts under `scripts/pr-preview/`.

## Prerequisites

### Accounts & Services

| Service      | Description                                            | Notes                                                                                                                                                                       |
| ------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AWS**      | Hosts S3 bucket, CloudFront distribution, Route53 DNS. | Requires ability to create CloudFormation stacks and manage ACM certificates.                                                                                               |
| **Supabase** | Dedicated preview project for PR data.                 | Service role password and API access token required. **Must be configured with OAuth and redirect URLs** - see [Supabase Preview Setup Guide](./supabase-preview-setup.md). |

### CLI Tooling (CI)

All tools are installed automatically in the workflow, but when running
locally ensure the following are available:

- `aws` CLI v2
- `supabase` CLI ≥ 2.54.11
- `psql` (PostgreSQL client) for teardown
- `npx` (Node.js ≥ 18)
- `jq` (JSON parsing in scripts)
- Optional: set `SUPABASE_MAX_RETRIES` (default `3`) to raise retry attempts when Supabase CLI operations are flaky.

## Before the AWS wizard phase

If you use `npm run setup:full`, the **aws** phase runs `scripts/pr-preview/bootstrap-aws-stack.sh`. Have the following **before** you answer **Yes** to that phase (the wizard prints the same checklist and waits for Enter).

### Checklist

| #   | Requirement                           | Details                                                                                                                                                                                                                              |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Apex domain in Route 53**           | Public hosted zone for your apex (e.g. `example.com`). If DNS is elsewhere, NS records must delegate to this zone.                                                                                                                   |
| 2   | **ACM certificate (TLS)**             | In **us-east-1**, status **Issued**, covering **apex** and **\*.apex** (DNS validation in Route 53). Required for CloudFront — not optional.                                                                                         |
| 3   | **AWS CLI credentials (local)**       | `aws sts get-caller-identity` succeeds on the machine running setup (`aws configure` access keys or `aws sso login`). IAM permissions for CloudFormation, S3, CloudFront, Route 53, ACM (read).                                      |
| 4   | **GitHub deploy credentials (later)** | Separate **IAM access key + secret** for CI (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) — collected in the setup **github** phase or added manually. Not the same as “CLI works on my laptop” unless you reuse the same IAM user. |

The wizard will ask for your **apex domain** and can auto-detect the hosted zone ID and certificate ARN when they already exist in the account.

### Rotating AWS deploy credentials

1. Create a new IAM access key for the deploy user (or replace SSO role policy as your org requires).
2. Update GitHub secrets **`AWS_ACCESS_KEY_ID`** and **`AWS_SECRET_ACCESS_KEY`** (and **`AWS_SESSION_TOKEN`** if temporary).
3. Disable/delete the old access key after a successful deploy workflow run.
4. Re-run `npm run setup:full -- --from=github` if you use the wizard to sync secrets.

## Infrastructure Provisioning

1. **Wildcard Certificate**
   - Issue an ACM certificate in `us-east-1` that covers `<domain>` and
     `*.<domain>`.
   - Example: `beakerstack.com`, `*.beakerstack.com`.

2. **DNS Hosted Zone**
   - Ensure Route53 manages the hosted zone for the domain.
   - The stack will create DNS records for:
     - `beakerstack.com` and `www.beakerstack.com` (production)
     - `staging.beakerstack.com` (staging)
     - `deploy.beakerstack.com` (previews)

3. **Deploy CloudFormation Stack**
   - Use `infra/aws/pr-preview-stack.yml`.
   - This creates **three separate environments** with separate S3 buckets and CloudFront distributions:
     - **Production:** `beakerstack.com-prod` bucket → `beakerstack.com` distribution
     - **Staging:** `beakerstack.com-staging` bucket → `staging.beakerstack.com` distribution
     - **Deploy/Preview:** `beakerstack.com-deploy` bucket → `deploy.beakerstack.com` distribution
   - Parameters:
     | Parameter | Example | Notes |
     | --- | --- | --- |
     | `DomainName` | `beakerstack.com` | Apex domain |
     | `HostedZoneId` | `Z0123456789` | Route53 hosted zone ID |
     | `CertificateArn` | `arn:aws:acm:us-east-1:...` | Wildcard cert covering `*.beakerstack.com` |
     | `LogsBucketName` | _(optional)_ | Leave blank for auto |
     | `PreviewPrefix` | `pr-` | Used for S3 folders (e.g., `pr-123`) |
   - Outputs used later:
     - `ProdBucketName`, `StagingBucketName`, `DeployBucketName`
     - `ProdDistributionId`, `StagingDistributionId`, `DeployDistributionId`
     - `PRPathRouterFunctionArn` (for path-based routing)

4. **Verify CloudFront Function**
   - The stack deploys `PRPathRouter` CloudFront Function for path-based routing on `deploy.beakerstack.com`.
   - Routes `/pr-<number>/*` paths to S3 prefix `pr-<number>/*`.
   - Handles SPA fallback: `/pr-<number>/some/route` → `pr-<number>/index.html`.
   - `infra/aws/functions/PRPathRouter.js` contains the logic.

## Secrets & Variables

Configure repository **Secrets** and **Variables** (Settings → Secrets and
variables → Actions) before enabling the workflow.

### Secrets

| Secret                                 | Purpose                                                               |
| -------------------------------------- | --------------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`                    | Deployer credentials (CloudFormation, S3, CloudFront).                |
| `AWS_SECRET_ACCESS_KEY`                | Matches above.                                                        |
| `AWS_SESSION_TOKEN`                    | Optional if using temporary credentials.                              |
| `PR_PREVIEW_CERTIFICATE_ARN`           | ACM certificate ARN (`us-east-1`).                                    |
| `SUPABASE_PREVIEW_PROJECT_REF`         | Target Supabase project ref (dedicated preview project).              |
| `SUPABASE_PREVIEW_DB_PASSWORD`         | Database password for the preview project.                            |
| `SUPABASE_PREVIEW_DB_URL`              | Connection URI (used for teardown schema drop).                       |
| `SUPABASE_ACCESS_TOKEN`                | Supabase personal access token (CLI authentication).                  |
| `PREVIEW_SUPABASE_URL`                 | Supabase API URL (Settings → API → Project URL).                      |
| `PREVIEW_SUPABASE_ANON_KEY`            | Supabase anon key (Settings → API → anon public key).                 |
| `PREVIEW_STRIPE_SECRET_KEY`            | Stripe test secret key used by preview Edge billing functions.        |
| `PREVIEW_STRIPE_WEBHOOK_SECRET`        | Stripe signing secret (`whsec_...`) for the preview webhook endpoint. |
| `PR_TESTING_SUPABASE_SERVICE_ROLE_KEY` | Service role key used when setting preview Edge billing secrets.      |
| `PRODUCTION_SUPABASE_URL`              | _(optional)_ Production Supabase URL for production deployments.      |
| `PRODUCTION_SUPABASE_ANON_KEY`         | _(optional)_ Production Supabase anon key.                            |
| `STAGING_SUPABASE_URL`                 | _(optional)_ Staging Supabase URL for staging deployments.            |
| `STAGING_SUPABASE_ANON_KEY`            | _(optional)_ Staging Supabase anon key.                               |

### Variables

| Variable                    | Description                       | Example                  |
| --------------------------- | --------------------------------- | ------------------------ |
| `PR_PREVIEW_DOMAIN`         | Root domain for all environments. | `beakerstack.com`        |
| `PR_PREVIEW_HOSTED_ZONE_ID` | Route53 zone ID.                  | `Z0123456789`            |
| `PR_PREVIEW_STACK_NAME`     | CloudFormation stack name.        | `beakerstack-pr-preview` |
| `PR_PREVIEW_PREFIX`         | Preview folder prefix in S3.      | `pr-`                    |
| `PR_PREVIEW_AWS_REGION`     | AWS region for stack.             | `us-east-1`              |

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
   - Resets template migrations + seed data when `supabase/` changed.
   - Applies adopter migrations (`npm run db:apply-adopter -- --linked`) when `adopter/db/` changed or after a full reset.
   - Generates TypeScript types for all packages when template migrations ran.
   - Uses `--skip-if-unchanged` to avoid contacting Supabase when neither `supabase/` nor `adopter/db/` changed.
5. Deploy billing Edge functions for preview:
   - Sets preview project Edge secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
   - Deploys `stripe-webhook` and `billing-stripe`.

6. Run `scripts/pr-preview/deploy-web.sh`
   - Builds Vite web app with `VITE_BASE_PATH="/pr-<number>"`.
   - Syncs to `s3://beakerstack.com-deploy/pr-<number>/`.
   - Invalidates CloudFront path `/pr-<number>/*` on deploy distribution.
   - Performs `curl` check on `https://deploy.<domain>/pr-<number>/`.
7. Post/update PR comment with web preview link.

### Teardown (`teardown-preview` job)

Triggered when a PR is `closed` (merged or abandoned).

1. Reads stack outputs for deploy bucket/distribution.
2. Runs `scripts/pr-preview/teardown.sh`:
   - Deletes S3 prefix `pr-<number>/` from deploy bucket.
   - Creates CloudFront invalidation for `/pr-<number>/*` on deploy distribution.
   - Drops Supabase schema `preview_pr_<number>` (if DB URL provided).
3. Cleans up GitHub metadata via the Deployments API:
   - Marks all deployments for `pr-<number>-preview` as `inactive`.
   - Deletes each deployment record.
   - Deletes the `pr-<number>-preview` environment so it no longer appears in the repository Environments / Deployments views.
   - Skipped for fork PRs; 404s are treated as non-fatal so teardown never fails over stale or already-removed GitHub metadata.

## Helper Scripts

| Script                      | Purpose                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `bootstrap-aws-stack.sh`    | Deploys/validates CloudFormation stack and exports outputs.                              |
| `reset-preview-database.sh` | Resets Supabase preview project (template migrations, adopter migrations, seeds, types). |
| `deploy-web.sh`             | Builds web app, uploads to S3, invalidates CloudFront, verifies URL.                     |
| `deploy-mobile.sh`          | Publishes Expo EAS update to PR-specific channel.                                        |
| `teardown.sh`               | Deletes S3 prefix, CloudFront cache, Supabase schema, Expo channel.                      |

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
     --skip-if-unchanged \
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

   The Expo project metadata (`apps/mobile/.eas/project.json`) is checked into this repo so CI and contributors target the same project automatically. If you intentionally point to a different Expo project, regenerate that file via `npx eas-cli init --id <Expo project ID>` inside `apps/mobile` and commit the update.

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
  Ensure `PRPathRouter` function is deployed with the latest code (see `infra/aws/functions/PRPathRouter.js`). Redeploy using
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
- **Google OAuth errors**  
  Configure Google OAuth provider in Supabase dashboard. See [Supabase Preview Setup Guide](./supabase-preview-setup.md) for detailed instructions.
- **Email confirmation redirects to localhost**  
  Configure site URL and redirect URLs in Supabase dashboard for preview domains. See [Supabase Preview Setup Guide](./supabase-preview-setup.md) for detailed instructions.

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
- **Secrets rotation:** rotate AWS, Supabase, Expo credentials periodically — AWS deploy keys: [Rotating AWS deploy credentials](#rotating-aws-deploy-credentials).
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

## Additional Configuration

### Supabase Preview Environment

Before deploying PR previews, you must configure your Supabase preview project for:

- Google OAuth provider setup
- Site URL and redirect URL configuration for preview domains
- Auth email (signup confirmation) via CI when `RESEND_SMTP_PASS` is set — see [Supabase Preview Setup](./supabase-preview-setup.md)

See [Supabase Preview Setup Guide](./supabase-preview-setup.md) for complete step-by-step instructions.

## References

- AWS CloudFront Function docs: <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html>
- Supabase CLI docs: <https://supabase.com/docs/reference/cli>
- Expo EAS Update docs: <https://docs.expo.dev/eas-update/introduction/>
- [Supabase Preview Setup Guide](./supabase-preview-setup.md) - Configuration instructions for Supabase preview environments

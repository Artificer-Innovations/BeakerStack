# Setup prep checklist

Read this **before** you run the full cloud wizard (`npm run setup` → option **2**, or `npm run setup:full`). It maps what the setup script will ask for to what you should have ready—especially values you **cannot look up later** (database passwords, some webhook secrets, newly created tokens).

For a short account checklist, see [QUICKSTART.md §6.4](../QUICKSTART.md#64-full-cloud-checklist-accounts-and-dns). For GitHub Actions secret **names** only, see [reference/github-actions-secrets.md](reference/github-actions-secrets.md) (`npm run docs:actions-secrets` regenerates that table from `scripts/lib/setup-manifest.mjs`).

The wizard prints the same GitHub / Supabase / AWS / Expo prerequisites in the terminal by default (`--guide=full`). Use `--guide=brief` or `--brief-guide` if you already read this doc and want a shorter banner.

**Do not commit** filled-in copies of this checklist or any `.env*` files with real secrets.

---

## Track A — Local setup (default)

`npm run setup` → **(1) Local** runs [`scripts/setup-local.sh`](../scripts/setup-local.sh). It does **not** ask interactive questions.

### Prerequisites

| Item                                         | Notes                                           |
| -------------------------------------------- | ----------------------------------------------- |
| Node.js **20** recommended (`>=18` required) | Matches CI                                      |
| **npm** `>=9`                                | `npm install` at repo root                      |
| **Docker Desktop** (or Docker Engine)        | For `supabase start`                            |
| **Supabase CLI**                             | [Install](https://supabase.com/docs/guides/cli) |

### After the script

1. If `.env.local` was created from [env.example](../env.example), replace placeholder Supabase keys with output from `supabase status` (URL, anon key, service role key).
2. Run `npm run dev:all` — web at http://localhost:5173.

Stripe, OAuth, AWS, and remote Supabase tiers are **not** part of local setup; see [Track B](#track-b--full-cloud--ci) and [Post-wizard work](#post-wizard-not-in-setup-full).

---

## Track B — Full cloud + CI

**Time:** often **1–3 hours** of focused work (excluding DNS propagation).

**Commands:** `npm run setup` → **(2)**, or `npm run setup:full` directly.

**Phases (in order):** `prereqs` → `identity` → `supabase` → `aws` → `expo` → `google` → `write` → `github`

Each phase (except `prereqs` and `write`) can be skipped with **(N)**; skipped phases print manual steps in the terminal. Resume with `--from=PHASE` (see [QUICKSTART.md §6.2](../QUICKSTART.md#62-full-interactive-bootstrap)).

### Decisions to make before you start

| Decision                        | When asked                                                       | Effect                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Enable mobile (Expo / EAS)?** | Start of full setup (`Enable mobile … [Y/n]`) or `--skip-mobile` | **No** → skips `expo` and `google` phases; set `MOBILE_ENABLED=false` for CI                                                            |
| **Rebrand template?**           | `identity` phase or `--skip-rename`                              | Runs `npm run rename` (display name + optional legal org string)                                                                        |
| **Supabase: create vs select**  | Per tier: `preview`, `staging`, `production`                     | Create → you set or accept a **DB password** (one-time if you do not save it)                                                           |
| **AWS PR-preview stack**        | `aws` phase                                                      | Needs apex domain, Route53 zone, ACM cert in **us-east-1**; may prompt for destructive bucket teardown if a prior deploy left conflicts |
| **Sync secrets to GitHub?**     | `github` phase or `--skip-github`                                | Needs `gh auth login` and repo admin                                                                                                    |

### Global prompts (every phase)

| Prompt                                               | Purpose                                  |
| ---------------------------------------------------- | ---------------------------------------- |
| `Press Enter after you have reviewed the checklist…` | Acknowledge prereqs (first run only)     |
| `Run "<phase>" now? (Y)es / (N)o skip / (Q)uit`      | Skip phase → manual instructions printed |

---

### Phase reference

#### `prereqs`

| You will be asked    | Have ready                                                 | Written to | One-time? |
| -------------------- | ---------------------------------------------------------- | ---------- | --------- |
| (none — checks only) | Node, npm; optional `supabase`, `aws`, `gh` CLIs installed | —          | —         |

#### `identity` (optional)

| You will be asked                                    | Have ready                                                  | Written to                      | One-time? |
| ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------- | --------- |
| `New display name:`                                  | Product name for rebrand                                    | Many files via `npm run rename` | —         |
| `Also replace legal organization string? (y/N)`      | Whether to change legal name in `package.json` author, etc. | Same                            | —         |
| `New legal organization name:`                       | If yes above                                                | Same                            | —         |
| Rename may ask: stop local Supabase / proceed / quit | If `supabase start` is running in this clone                | —                               | —         |

See [renaming.md](renaming.md). Tip: `npm run rename -- --dry-run` first.

#### `supabase`

| You will be asked                                                      | Have ready                                                                                                                                            | Written to                               | One-time?                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Supabase PAT (paste / retry / skip) if CLI not logged in               | [Dashboard access token](https://supabase.com/dashboard/account/tokens) or `supabase login` in **Terminal.app** (IDE terminals sometimes break login) | `SUPABASE_ACCESS_TOKEN`                  | Token can be rotated; save for CI                      |
| `Choose org index [0]:`                                                | Know which Supabase org owns your projects                                                                                                            | —                                        | —                                                      |
| `Default region for new projects [us-east-1]:`                         | Region if creating projects                                                                                                                           | —                                        | —                                                      |
| Per tier (`staging`, `production`, `preview`): `(c)reate or (s)elect?` | Whether to create new projects or pick existing                                                                                                       | —                                        | —                                                      |
| `[tier] project name slug […]:`                                        | Slug if creating (default from app config)                                                                                                            | Project name in Supabase                 | —                                                      |
| `[tier] Database password` (masked)                                    | Strong password or blank for random                                                                                                                   | `*_SUPABASE_DB_PASSWORD`, GitHub secrets | **Yes** — Supabase does not show the DB password again |
| `[tier] Project index`                                                 | If selecting existing                                                                                                                                 | URLs, anon keys, refs in acc             | —                                                      |
| GitHub: paste token for Actions                                        | Same PAT as above                                                                                                                                     | `SUPABASE_ACCESS_TOKEN` secret           | —                                                      |

**Env keys (examples):** `STAGING_*`, `PRODUCTION_*`, `PREVIEW_*`, `PR_TESTING_*`, `SUPABASE_PREVIEW_*` → `.env.cloud.generated.local` / `.env.local`

**Deep dive:** [supabase-staging-production-setup.md](supabase-staging-production-setup.md), [supabase-preview-setup.md](supabase-preview-setup.md)

#### `aws`

| You will be asked                                            | Have ready                                                                | Written to                   | One-time?      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------- | -------------- |
| AWS login fix: SSO / configure / re-check / skip             | IAM user or SSO profile with CloudFormation, S3, CloudFront, Route53, ACM | `AWS_*` for CI               | Keys rotatable |
| `APEX domain (e.g. example.com):`                            | Your production apex                                                      | `PR_PREVIEW_DOMAIN`          | —              |
| Route53 hosted zone (discovered or manual)                   | Public zone for apex in this AWS account                                  | `PR_PREVIEW_HOSTED_ZONE_ID`  | —              |
| ACM certificate ARN **us-east-1** (apex + `*.apex`)          | Issued, DNS-validated cert                                                | `PR_PREVIEW_CERTIFICATE_ARN` | —              |
| `CloudFormation stack name […]:`                             | Unique stack name                                                         | `PR_PREVIEW_STACK_NAME`      | —              |
| `AWS region [us-east-1]:`                                    | Region for stack                                                          | `PR_PREVIEW_AWS_REGION`      | —              |
| `Preview URL prefix [pr-]:`                                  | Path prefix for PR URLs                                                   | `PR_PREVIEW_PREFIX`          | —              |
| Preflight: delete FAILED change sets?                        | —                                                                         | —                            | —              |
| Conflict: skip / continue / **destructive bucket teardown**  | Understand risk to S3 buckets named `<apex>-prod`, `-staging`, `-deploy`  | —                            | Destructive    |
| `ACKNOWLEDGE CLOUDFRONT RISK` / `PERMANENTLY DELETE BUCKETS` | Only if destructive path                                                  | —                            | —              |
| `(D)eploy or (R)efresh outputs`                              | Existing healthy stack                                                    | `.env.aws.generated.local`   | —              |

**Deep dive:** [pr-preview-setup.md](pr-preview-setup.md)

#### `expo` (skipped if mobile disabled)

| You will be asked                             | Have ready                                                     | Written to                                         | One-time?                                     |
| --------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| `Run eas-cli login now? (Y/n/q)`              | Expo account                                                   | Session local to machine                           | —                                             |
| Link UUID / new project / skip                | Existing EAS project UUID or run `eas init`                    | `EXPO_PROJECT_ID`, `apps/mobile/.eas/project.json` | —                                             |
| `Existing EAS project UUID` or read from init | UUID from [expo.dev](https://expo.dev)                         | `EXPO_PROJECT_ID`                                  | —                                             |
| `EXPO_TOKEN` (paste, file, or env)            | [Access token](https://expo.dev/settings/access-tokens) for CI | GitHub `EXPO_TOKEN`                                | **Save when created** — treat like a password |

#### `google` (skipped if mobile disabled)

| You will be asked              | Have ready                        | Written to                   | One-time?                 |
| ------------------------------ | --------------------------------- | ---------------------------- | ------------------------- |
| `Path to google-services.json` | File from Firebase / Google Cloud | `GOOGLE_SERVICES_*` env keys | File can be re-downloaded |

#### `write`

| You will be asked | Have ready | Written to                                 | One-time? |
| ----------------- | ---------- | ------------------------------------------ | --------- |
| (automatic merge) | —          | `.env.cloud.generated.local`, `.env.local` | —         |

#### `github`

| You will be asked                             | Have ready                                     | Written to                                                                   | One-time?                             |
| --------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| `Run gh auth login now? (Y/n/q)`              | GitHub admin on **your** fork                  | `gh` session                                                                 | —                                     |
| Enter missing CI values / path to dotenv file | Any keys still empty after earlier phases      | GitHub secrets & variables per [manifest](../scripts/lib/setup-manifest.mjs) | Masked for secrets                    |
| Per missing manifest entry                    | Stripe keys, signing keys, etc. if not set yet | `gh secret set` / `gh variable set`                                          | Webhook secrets: **save at creation** |

Full name list: [reference/github-actions-secrets.md](reference/github-actions-secrets.md).

---

## Post-wizard (not in setup-full)

The wizard does **not** walk through these end-to-end. Plan time after `setup:full` completes.

| Topic                    | Why separate                                                                                 | Doc                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Stripe billing**       | Keys may only appear during GitHub “missing CI” prompts; webhooks need per-project endpoints | [stripe-billing-setup.md](stripe-billing-setup.md)             |
| **Google / Apple OAuth** | Supabase Auth providers + redirect URLs per environment                                      | [OAUTH.md](OAUTH.md)                                           |
| **Lighthouse CI**        | Optional PR status checks                                                                    | [lighthouse-ci.md](lighthouse-ci.md) — `LHCI_GITHUB_APP_TOKEN` |
| **Branch protection**    | Rules on `develop` / `main`                                                                  | [branch-protection-setup.md](branch-protection-setup.md)       |
| **Project label bridge** | Optional org Project automation                                                              | [project-label-bridge.md](project-label-bridge.md)             |

---

## My values (copy locally — do not commit)

Duplicate this block into a password manager or a **gitignored** note. Leave blanks until you generate each value.

```text
# Identity
NEW_DISPLAY_NAME=
NEW_LEGAL_NAME=

# Supabase
SUPABASE_ACCESS_TOKEN=
SUPABASE_ORG_INDEX=
SUPABASE_REGION=us-east-1
PREVIEW_DB_PASSWORD=
STAGING_DB_PASSWORD=
PRODUCTION_DB_PASSWORD=

# AWS
APEX_DOMAIN=
ROUTE53_HOSTED_ZONE_ID=
ACM_CERTIFICATE_ARN_us-east-1=
CF_STACK_NAME=
AWS_REGION=us-east-1
PR_PREVIEW_PREFIX=pr-
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Expo (if mobile enabled)
EXPO_ACCOUNT=
EXPO_PROJECT_ID=
EXPO_TOKEN=

# Google mobile (if applicable)
GOOGLE_SERVICES_JSON_PATH=

# Stripe (post-wizard)
STAGING_STRIPE_SECRET_KEY=
STAGING_STRIPE_WEBHOOK_SECRET=
PRODUCTION_STRIPE_SECRET_KEY=
PRODUCTION_STRIPE_WEBHOOK_SECRET=
PREVIEW_STRIPE_SECRET_KEY=
PREVIEW_STRIPE_WEBHOOK_SECRET=
```

---

## Maintenance

If you add or change prompts in `scripts/setup-full.mjs` or phase text in `scripts/lib/setup-manual-instructions.mjs`, update this file in the same PR. If you change `scripts/lib/setup-manifest.mjs`, run `npm run docs:actions-secrets` and commit [reference/github-actions-secrets.md](reference/github-actions-secrets.md).

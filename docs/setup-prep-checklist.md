# Setup prep checklist

Use this **before** `npm run setup:full` (or menu option **2**). Each phase below lists **have ready** then **you will be asked**.

| Also useful                             | Link                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| Account checklist (short)               | [QUICKSTART §6.4](../QUICKSTART.md#64-full-cloud-checklist-accounts-and-dns) |
| GitHub secret **names**                 | [reference/github-actions-secrets.md](reference/github-actions-secrets.md)   |
| Terminal banner (same topics, optional) | `npm run setup:full -- --guide=full`                                         |

Do not commit filled-in values or `.env*` files with secrets.

---

## Pick a path

| Path                | Command                   | This doc                                                                |
| ------------------- | ------------------------- | ----------------------------------------------------------------------- |
| **Local** (default) | `npm run setup` → **(1)** | [Track A](#track-a--local) only                                         |
| **Full cloud + CI** | `npm run setup:full`      | [Track B](#track-b--full-cloud) + [After the wizard](#after-the-wizard) |

---

## Track A — Local

**No wizard questions.** Needs Node 20 (or ≥18), npm, Docker, Supabase CLI → `npm install` → `npm run setup` → **(1)**.

**After:** copy keys from `supabase status` into `.env.local` if placeholders remain → `npm run dev:all` (http://localhost:5173).

---

## Track B — Full cloud

**Phases:** `prereqs` → `identity` → `supabase` → `aws` → `expo` → `google` → `write` → `github`  
**Skip a phase:** answer **N** at `Run "<phase>" now?`  
**Resume:** `npm run setup:full -- --from=supabase` (etc.)

### Decide first

| Question                | If **no** / skip                          |
| ----------------------- | ----------------------------------------- |
| Mobile (Expo / EAS)?    | `--skip-mobile` → skips `expo` + `google` |
| Rebrand template?       | `--skip-rename` → skips `identity`        |
| Push secrets with `gh`? | `--skip-github` → skips `github` sync     |

### At a glance

| Phase    | One-time secrets?                | Notes                                                  |
| -------- | -------------------------------- | ------------------------------------------------------ |
| prereqs  | —                                | CLI checks only                                        |
| identity | —                                | Optional rename                                        |
| supabase | **DB passwords**                 | 3 tiers: preview, staging, production                  |
| aws      | —                                | May ask destructive bucket teardown                    |
| expo     | **EXPO_TOKEN**                   | Skipped if no mobile                                   |
| google   | —                                | `google-services.json` path                            |
| write    | —                                | Merges `.env*` files                                   |
| github   | Stripe webhooks, etc. if missing | May prompt `CLOUDFRONT_*` if you set up signed cookies |

---

### prereqs

**Have ready:** Node, npm; install `supabase`, `aws`, `gh` if you want those phases automated.

**You will be asked:** nothing (checks only) → Press Enter after reading this doc / banner.

---

### identity (optional)

**Have ready:** new product display name; optional new legal org name ([renaming.md](renaming.md)).

**You will be asked:**

- `New display name:`
- `Also replace legal organization string? (y/N)` → optional `New legal organization name:`
- If local Supabase is running: stop / proceed / quit

**Saved as:** repo-wide rename (many files).

---

### supabase

**Have ready:**

- Supabase account + org
- [Personal access token](https://supabase.com/dashboard/account/tokens) (or `supabase login` in **Terminal.app** — IDE terminals often break Supabase login)
- Per tier (**preview**, **staging**, **production**): create new vs pick existing project
- **DB password per tier if creating** — Supabase will **not** show it again (**one-time**)

**You will be asked:**

- Paste PAT if CLI not logged in
- `Choose org index [0]:`
- `Default region for new projects [us-east-1]:`
- Each tier: `(c)reate or (s)elect?` → slug and **database password** (masked), or project index
- After all tiers: **personal access token** for GitHub — **Press Enter** opens [account tokens](https://supabase.com/dashboard/account/tokens); create **personal access token** (`sbp_…`), expiry **90 days–1 year** (not project API keys); rotate later per [supabase-staging-production-setup.md § Rotating](supabase-staging-production-setup.md#rotating-supabase_access_token)

**Saved as:** `STAGING_*`, `PRODUCTION_*`, `PREVIEW_*`, `PR_TESTING_*`, `SUPABASE_PREVIEW_*` → `.env.cloud.generated.local` / `.env.local`; `SUPABASE_ACCESS_TOKEN` on GitHub.

**More:** [supabase-staging-production-setup.md](supabase-staging-production-setup.md), [supabase-preview-setup.md](supabase-preview-setup.md)

---

### aws

**Have ready (before you answer Yes to the aws phase — wizard shows checklist + Enter):**

1. **Route 53** — public hosted zone for your **apex** domain (NS delegated to Route 53 if registered elsewhere).
2. **ACM (us-east-1 only)** — certificate **Issued** for **apex + \*.apex**, DNS-validated in Route 53 (required for CloudFront).
3. **AWS CLI on this machine** — `aws sts get-caller-identity` works (`aws configure` keys or SSO); IAM can run CloudFormation, S3, CloudFront, Route 53.
4. **CI keys (later)** — separate IAM **access key ID + secret** for GitHub Actions (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in **github** phase).

**You will be asked:**

- **Press Enter** when the checklist above is done
- Fix AWS login if `sts get-caller-identity` fails
- `APEX domain` → confirm or enter hosted zone ID + ACM ARN (auto-discovered when possible)
- `CloudFormation stack name`, `AWS region`, `Preview URL prefix`
- On conflicts: skip / continue / **destructive** bucket teardown
- Existing stack: deploy or refresh outputs

**Saved as:** `PR_PREVIEW_*` → `.env.aws.generated.local` + GitHub variables.

**More:** [pr-preview-setup.md § Before the AWS wizard phase](pr-preview-setup.md#before-the-aws-wizard-phase)

---

### expo (mobile only)

**Have ready (before Yes — wizard shows checklist + Enter):**

1. **Expo account** — [expo.dev](https://expo.dev); use Terminal.app if `eas login` fails in the IDE.
2. **EAS project** — existing **Project ID** (UUID) to **[l]ink**, or plan **[n]ew** `eas init`; template BeakerStack project id must be replaced.
3. **Access token for CI** — create at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) when prompted (**save when created**).

**You will be asked:**

- **Press Enter** when ready
- `eas login`? (if `eas whoami` failed)
- `[l] Link` / `[n] New` / `[s] Skip` / `[q] Quit` for EAS project
- **Press Enter** → browser → paste **EXPO_TOKEN** (automation access token, not password)

**Saved as:** `EXPO_PROJECT_ID`, `EXPO_TOKEN`, `EXPO_ACCOUNT` → env + GitHub.

**More:** [MOBILE_BUILD_TESTING.md § Before the Expo wizard phase](MOBILE_BUILD_TESTING.md#before-the-expo-wizard-phase)

---

### google (mobile only, optional)

**Have ready (before Yes — wizard shows checklist + Enter):**

1. **Optional** — skip entirely if you have no native mobile Google Sign-In yet.
2. **Firebase** Android app with package name matching `apps/mobile` (`com.anonymous.beakerstack` unless renamed).
3. **`google-services.json`** downloaded (Firebase → Project settings → Your apps → Android).

**You will be asked:**

- **Press Enter** to continue (or skip with blank at path prompt)
- `Path to google-services.json` — absolute or relative path; **Enter** = skip

**Saved as:** `GOOGLE_SERVICES_*` → GitHub secrets in **github** phase.

**Not this phase:** Supabase web Google OAuth → [OAUTH.md](OAUTH.md).

**More:** [MOBILE_BUILD_TESTING.md § Before the Google wizard phase](MOBILE_BUILD_TESTING.md#before-the-google-wizard-phase)

---

### write

**Have ready:** nothing.

**You will be asked:** nothing (automatic merge to `.env.cloud.generated.local` and `.env.local`).

---

### github

**Have ready (before Yes — wizard shows checklist + Enter):**

1. **Your fork, not upstream** — clone the repo you own (`git remote -v` → your `owner/name`). The wizard runs `gh secret set` / `gh variable set` on **`gh repo view`** for this directory. If you cloned `Artificer-Innovations/BeakerStack` directly, you will be asked to type the repo name to confirm before touching the public template. Prefer **N** / `--skip-github` on upstream clones; sync on your fork instead.
2. **[GitHub CLI](https://cli.github.com)** installed; `gh auth login`; **admin** on **your** fork (manage Actions secrets).
3. **Values from earlier phases** in `.env.local` / `.env.cloud.generated.local` / `.env.aws.generated.local` (wizard merges them). Anything you skipped (AWS, Supabase, expo, google, Stripe) may be prompted now.
4. **Web-only after skipping mobile?** Plan to set **`MOBILE_ENABLED=false`** when asked, or re-run with `--skip-mobile`.
5. Optional: a **.env file** with remaining keys to paste in bulk.

**You will be asked:**

- **Press Enter** when ready (or **N** to skip entire phase / use `--skip-github`)
- **Target repo summary** + confirm (type full `owner/repo` if upstream template; otherwise Y/n)
- `gh auth login`? if not authenticated
- Enter missing CI values? → path to dotenv file → per-key prompts (secrets masked)
- Then `gh secret set` / `gh variable set` for each resolved value (names only logged)

**Saved as:** GitHub repository **secrets** and **variables** — full list: [reference/github-actions-secrets.md](reference/github-actions-secrets.md).

**Still manual after sync:** Stripe webhooks per env, OAuth in Supabase — not pushed by this phase alone.

---

## After the wizard

Not run by `setup-full`. Do these when you need them.

| Task                             | In wizard?                               | What to do                                                     |
| -------------------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| **Stripe billing**               | Only if keys missing at `github` sync    | [stripe-billing-setup.md](stripe-billing-setup.md)             |
| **Google / Apple OAuth**         | No                                       | [OAUTH.md](OAUTH.md)                                           |
| **Signed-cookie preview access** | **No** — separate script after AWS stack | See below                                                      |
| **Lighthouse CI**                | No                                       | [lighthouse-ci.md](lighthouse-ci.md) — `LHCI_GITHUB_APP_TOKEN` |
| **Branch protection**            | No                                       | [branch-protection-setup.md](branch-protection-setup.md)       |

### Signed-cookie access (optional)

By default PR previews and staging are **public**. To gate them with CloudFront **signed cookies** (internal stakeholders click a bootstrap link from the PR comment):

**Have ready:** AWS stack already deployed (`PR_PREVIEW_STACK_NAME`, `PR_PREVIEW_DOMAIN` from the `aws` phase); `aws`, `openssl`, `jq`, `gh` in PATH.

**You will be asked (separate script, not `setup-full`):**

```bash
./scripts/pr-preview/setup-signed-cookies.sh \
  --stack-name "${PR_PREVIEW_STACK_NAME}" \
  --domain "${PR_PREVIEW_DOMAIN}" \
  --enable-preview
```

Add `--enable-staging` to lock staging too. The script generates an RSA key pair, updates CloudFormation (`signed-cookies` mode), and sets GitHub secrets `CLOUDFRONT_SIGNING_KEY` + `CLOUDFRONT_SIGNING_KEY_ID`. Allow **5–10 minutes** for CloudFront to propagate.

If you skip the script but add those secrets manually, the `github` phase may still prompt for them when syncing CI.

**More:** [preview-access-control.md](preview-access-control.md)

---

## My values (copy locally — do not commit)

> Copy this block to a file **outside** this repo (e.g. `~/beakerstack-setup.txt`) before filling in values.

```text
# Identity
NEW_DISPLAY_NAME=
NEW_LEGAL_NAME=

# Supabase (one-time: DB passwords)
SUPABASE_ACCESS_TOKEN=
PREVIEW_DB_PASSWORD=
STAGING_DB_PASSWORD=
PRODUCTION_DB_PASSWORD=

# AWS
APEX_DOMAIN=
ROUTE53_HOSTED_ZONE_ID=
ACM_CERTIFICATE_ARN_us-east-1=
CF_STACK_NAME=
PR_PREVIEW_PREFIX=pr-

# Expo (mobile)
EXPO_PROJECT_ID=
EXPO_TOKEN=

# AWS CI
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Signed cookies (optional, post-wizard)
CLOUDFRONT_SIGNING_KEY_ID=

# Stripe (post-wizard)
STAGING_STRIPE_WEBHOOK_SECRET=
PRODUCTION_STRIPE_WEBHOOK_SECRET=
```

---

## Maintenance

Wizard prompt changes → update this file. Manifest changes → `npm run docs:actions-secrets`.

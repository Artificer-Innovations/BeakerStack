# Quick start

**Rough time:** **~5–15 minutes** to a working local stack (web + mobile + Supabase) after `npm install`, if Docker is already installed and images can be pulled. **First-time full cloud + CI** (AWS + three Supabase projects + Expo + GitHub secrets) is usually **1–3 hours** of focused work, not counting DNS propagation.

---

## 1. Create your repository (recommended)

This repo is a **GitHub template**.

1. Open the GitHub page for the template (e.g. `Artificer-Innovations/BeakerStack`).
2. Click **Use this template** → **Create a new repository** (choose owner, name, visibility).
3. Clone **your** new repository (replace the URL):

   ```bash
   git clone https://github.com/<your-org>/<your-repo>.git
   cd <your-repo>
   ```

If you are only browsing upstream and not using the template, you can `git clone` the upstream URL instead, but you will not get a clean default branch story until you fork or template-copy.

---

## 2. Install dependencies

```bash
npm install
```

Use **Node.js 20** if you can (GitHub Actions uses 20); `package.json` allows `>=18`.

---

## 3. Rename the template (optional, before setup)

If you are rebranding from “Beaker Stack,” run a dry run first, then apply:

```bash
npm run rename -- --from "Beaker Stack" --to "Your New Name" --dry-run
```

Add `--strict` to fail if legacy identifiers remain, then rerun **without** `--dry-run`. Full notes: [docs/renaming.md](docs/renaming.md).

If `npm run setup` offers the identity / rename step, it reads the current product name from `packages/shared` branding and the legal string from `package.json` author, then only asks for the **new** display name and optional new legal name. If those sources do not match what is still in the rest of the repo, run `npm run rename` yourself with explicit `--from` / `--from-legal` (see [docs/renaming.md](docs/renaming.md)). If the CLI reports local Supabase as running, you can stop it from the rename prompt or choose to proceed when the running stack is from another clone.

---

## 4. Run the setup menu (local path)

Run:

```bash
npm run setup
```

You should see a banner and a prompt similar to:

```text
========================================================================
+                                                                        +
+                         Beaker Stack                                    +
+                                                                        +
+         Choose (1) local setup or (2) full cloud wizard.                +
+                                                                        +
========================================================================

[setup] …
Setup: (1) Local — … [default]  (2) Full cloud — … (read README + QUICKSTART first)  (q) Quit:
```

Choose **(1) Local** (press Enter for the default). That path wires dependencies, copies `env.example` toward `.env.local`, starts **Supabase in Docker**, and runs type generation when the script completes.

If you have **no TTY** (some CI or piped shells), the menu falls back to local-only or tells you to run `npm run setup:full` explicitly.

---

## 5. Start the apps locally

```bash
npm run dev:all
```

- Web: **http://localhost:5173**
- Mobile: Expo dev server (see terminal output); use `npm run mobile:ios` or `npm run mobile:android` from the root if you prefer dev-client + simulator flows.

**Manual fallback** (if you skipped the script): copy [env.example](env.example) to `.env.local`, run `supabase start`, then `npm run gen:types`.

---

## 6. When you are ready for staging, production, and CI

Skip this section until you want **remote** Supabase projects, **AWS** hosting, **Expo** in CI, and **GitHub Actions** deploys.

### 6.1 CI needs tokens on GitHub

GitHub Actions **cannot** see your laptop’s `supabase login`, AWS named profiles, or `eas login`. Store **machine credentials** as repository **secrets** (and variables). A human-readable table is committed at [docs/reference/github-actions-secrets.md](docs/reference/github-actions-secrets.md). It is **generated from source** so it cannot drift from the wizard:

```bash
npm run docs:actions-secrets
```

Commit any updates to `docs/reference/github-actions-secrets.md` when you change `scripts/lib/setup-manifest.mjs`.

At minimum for deploy workflows you will need **`SUPABASE_ACCESS_TOKEN`** and **AWS access keys** (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, plus optional `AWS_SESSION_TOKEN`), plus the Supabase URL/keys and project refs for each tier—see the generated table. **`EXPO_TOKEN`**, `EXPO_PROJECT_ID`, `EXPO_ACCOUNT`, and all `GOOGLE_SERVICES_*` entries are mobile-only; set `MOBILE_ENABLED=false` (GitHub variable) to skip them for web-only repos.

**Lighthouse CI** scores are posted as GitHub status checks on each PR preview if `LHCI_GITHUB_APP_TOKEN` is set (install the [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci) to get the token). The step is skipped automatically when the preview is signed-cookie gated — Lighthouse cannot authenticate headlessly. See [docs/lighthouse-ci.md](docs/lighthouse-ci.md) for details.

### 6.2 Full interactive bootstrap

```bash
npm run setup:full
```

Options (see also `npm run setup:full -- --help`):

| Flag                 | Meaning                                     |
| -------------------- | ------------------------------------------- |
| `--dry-run`          | No file writes; log-only GitHub sync        |
| `--from=PHASE`       | Resume at a phase (see table below)         |
| `--skip-rename`      | Skip template rename                        |
| `--skip-github`      | Do not push secrets with `gh`               |
| `--skip-mobile`      | Skip Expo/EAS/Google setup (web-only repos) |
| `--aws-profile=NAME` | Pass through to AWS bootstrap script        |

**Phase names** for `--from=` (order matters; later phases assume earlier work or merged `.env*` files):

| Phase      | What it does                                                            |
| ---------- | ----------------------------------------------------------------------- |
| `prereqs`  | Checks Node/npm; reports `supabase` / `aws` / `gh` presence             |
| `identity` | Optional `npm run rename` flow                                          |
| `supabase` | Remote Supabase projects and keys into gitignored env files             |
| `aws`      | Optional CloudFormation / PR-preview stack bootstrap                    |
| `expo`     | EAS project link or `eas init`; collect `EXPO_TOKEN`                    |
| `google`   | Optional `google-services.json` → env keys                              |
| `write`    | Merge collected values into `.env.cloud.generated.local` / `.env.local` |
| `github`   | Optional `gh secret set` / `variable set` from manifest                 |

### 6.3 Full-cloud checklist (accounts and DNS)

Work through these when you are ready; they are intentionally dense.

**GitHub**

- [ ] Admin-capable repo; **`develop`** and **`main`** for staging/production workflows.
- [ ] [GitHub CLI](https://cli.github.com/) + `gh auth login` if the wizard should sync secrets.

**Supabase**

- [ ] Account + org; CLI auth or dashboard token for the wizard.
- [ ] **CI:** personal access token → `SUPABASE_ACCESS_TOKEN` on GitHub.
- [ ] Three remote projects (preview, staging, production) + DB passwords for `supabase link` in CI.

**AWS**

- [ ] Route 53 hosted zone; **ACM cert in `us-east-1`** (apex + wildcard).
- [ ] IAM for local bootstrap; **CI:** access keys as GitHub secrets (not only `~/.aws`).

**Expo**

- [ ] EAS project for `apps/mobile`; **`EXPO_TOKEN`** as a GitHub secret.

**Google (OAuth + mobile)**

- [ ] Firebase / Google Cloud OAuth clients; `google-services.json` where required.
- [ ] Supabase Auth Google provider + redirect URLs: [docs/supabase-preview-setup.md](docs/supabase-preview-setup.md), [docs/supabase-staging-production-setup.md](docs/supabase-staging-production-setup.md).

**Deep dives:** [docs/pr-preview-setup.md](docs/pr-preview-setup.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/README.md](docs/README.md).

Do not commit `.env*` files; sensitive paths are listed in [.cursorignore](.cursorignore).

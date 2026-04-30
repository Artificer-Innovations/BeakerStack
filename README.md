# Beaker Stack

Beaker Stack is a **monorepo template** for building **Supabase-backed** applications that ship on **web (React + Vite)** and **mobile (React Native + Expo)** at the same time: **one product, two surfaces, one backend, one deploy pipeline.**

Most full-stack templates optimize for getting an app running. Beaker Stack optimizes for the **pipeline around it**—local parity, PR previews, staging from `develop`, production from `main`, and shared business logic so web and mobile do not drift.

> **What you end up with:** **Production** at `https://yourdomain.com`, **staging** at `https://staging.yourdomain.com`, and **every pull request** getting an **ephemeral web URL** at `https://deploy.yourdomain.com/pr-<number>/` (path-based previews on AWS). When CI secrets are configured, **Expo EAS** update channels align to preview, staging, and production. Env keys and GitHub Actions secrets follow a **single manifest** so pipelines trust the same layout you use locally. It is the small-team version of infrastructure many solo stacks skip—without giving up a sane SDLC.

## Why this shape

**1. SDLC from day one, not later.** The usual small-project arc is: move fast, add CI when it hurts, add staging when it really hurts, skip PR previews entirely. That is cheap on day one and expensive on day ninety—manual deploys, no rollback story, and a “staging” environment that is really hope. Beaker Stack assumes the **pipeline is part of the product**: developers test against **local** Supabase; **every PR** gets a **deploy URL** (and optional mobile channel) so the change runs in an environment close to production; **merged work on `develop`** flows to **staging**; **production** is fed by a **deliberate `develop` → `main`** promotion, not ad-hoc pushes.

**2. Review discipline: the artifact under review is the running change, not only the diff.** Every PR gets a **URL** so reviewers answer whether the behavior works **in situ**, without cloning the branch. That catches integration issues before merge. There is a one-time cost to wire DNS and secrets; **per-PR marginal cost stays low** once the stack exists.

**3. Shared code as discipline, not a headline percentage.** Most teams end up with a React tree and a React Native tree that **drift**. Putting business logic, validation, and types in **`packages/shared`** is not mainly a reuse metric—it is a rule that **one product on two surfaces** stays true **by construction**, not aspirationally.

## Why the setup wizard exists

Standing up Route 53, ACM, three Supabase tiers, EAS, and GitHub secrets **by hand** would contradict the claim that small teams can afford this shape. **`npm run setup`** (local path: Docker Supabase, `.env.local`, type generation) and **`npm run setup:full`** (remote resources, optional AWS bootstrap, optional `gh` sync) exist **because** the thesis is that ceremony is cheap **when the template does the work on day one**. One command (plus honest prerequisites in [QUICKSTART.md](QUICKSTART.md)) is how “SDLC from day one” stops being aspirational.

**Who it is for:** Teams whose bottleneck is **shipping safely** (reviews, previews, staged promotion) at least as much as raw feature throughput—and who want Supabase plus **paired web and mobile** without two divergent codebases.

**How this differs from app-first starters (e.g. T3, create-t3-turbo, default Expo templates):** Those optimize for **getting an app running**. Beaker Stack optimizes for the **pipeline around the app**: local parity, PR-in-situ review, staging from `develop`, production from `main`, and secrets/env layout that CI can trust. If you only need one surface and a single deploy button, a simpler template is the right trade. If you want **small-team SDLC without the usual “add it when we need it” regret**, this shape is the bet.

The specific machinery (tiered Supabase, AWS static hosting with PR paths, EAS channels, and the `setup-manifest` map for Actions secrets) is listed below. **That list is how the opinions are implemented, not why you would adopt them.**

**Stack versions (from the repo today):** web uses **React 18.2** and **Vite 5**; mobile uses **Expo SDK ~50** and **React Native 0.73**; CI uses **Node 20** and **Supabase CLI 2.54.11** (see `.github/workflows`).

**Out of the box you get:** Email + Google auth flows (with optional Apple per [docs/oauth/OAUTH_SETUP.md](docs/oauth/OAUTH_SETUP.md)), user profiles + RLS patterns, Maestro-oriented E2E layout, and scripts for local Docker Supabase plus full-cloud bootstrap.

---

**[Get started → QUICKSTART.md](QUICKSTART.md)** — **Use this template**, local “hello world” in minutes, full-cloud checklist when you are ready.

| Need                  | Doc                                |
| --------------------- | ---------------------------------- |
| Full topic index      | [docs/README.md](docs/README.md)   |
| Environments & design | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Contributing          | [CONTRIBUTING.md](CONTRIBUTING.md) |

## Features

- **Monorepo** — `apps/web`, `apps/mobile`, `packages/shared`, `supabase/`.
- **Supabase** — Local Docker + shared preview + staging + production remotes ([ARCHITECTURE.md](ARCHITECTURE.md)).
- **Auth** — Email/password and Google (Supabase + native Google on mobile when configured); user-scoped RLS; extend migrations for org/tenant models if needed.
- **Web (AWS)** — PR previews, staging, production static hosting via CloudFormation helpers under `scripts/pr-preview/`.
- **Mobile (Expo)** — EAS dev client workflow; CI can publish OTA updates per environment when secrets are set.
- **CI/CD** — PR workflow, `develop` → staging, `main` → production ([.github/workflows](.github/workflows)).
- **Setup UX** — `npm run setup` menu and `npm run setup:full` phased wizard (`--dry-run`, `--from=PHASE`); secrets only in gitignored files.

## Prerequisites (summary)

- **Local dev:** Node **20** recommended (`>=18` in `package.json`), npm `>=9`, Docker Desktop, Supabase CLI; native toolchains if you build iOS/Android; Maestro for some E2E commands. **Typical time:** about **5–15 minutes** after `npm install` if Docker images are warm (see [QUICKSTART.md](QUICKSTART.md)).
- **Full cloud + CI:** accounts, DNS, ACM, IAM, Supabase PAT, `EXPO_TOKEN`, GitHub secret sync — often **1–3 hours** the first time. Details and checklists: [QUICKSTART.md](QUICKSTART.md) and [docs/reference/github-actions-secrets.md](docs/reference/github-actions-secrets.md).

### What is not included (costs and vendor bills)

This template wires **real** cloud resources. You pay vendors under **their** pricing, not ours. Expect ongoing charges roughly along these lines (order-of-magnitude; check current pricing):

- **Supabase** — Remote projects typically need a **paid** tier for serious staging/production (often on the order of **~$25/month per project** on Pro-class plans; preview can sometimes stay smaller). Local dev stays free in Docker.
- **AWS** — Route 53 hosted zones, ACM (certs are usually free), S3 storage, CloudFront egress, and Lambda@Edge or function charges where the stack uses them—all **usage-based**.
- **Expo / EAS** — Free tier exists; **EAS Update** and **build minutes** can move you to paid plans as usage grows.
- **Google Cloud** — OAuth clients and Firebase-related APIs may incur charges at scale; small teams often stay within free tiers for auth-only usage.

If you need a **zero-cloud** path, stay on **local** Supabase and skip `setup:full` until you are ready.

## Documentation

- [QUICKSTART.md](QUICKSTART.md) — **Start here**
- [docs/README.md](docs/README.md) — All guides (OAuth, AWS, Supabase, testing)
- [docs/guides/MOBILE.md](docs/guides/MOBILE.md) — Native rebuild and dev-client commands
- [docs/BRANDING.md](docs/BRANDING.md) — Icons and theme
- [docs/TESTING.md](docs/TESTING.md) — Test strategy
- [docs/renaming.md](docs/renaming.md) — Rename the template (also [QUICKSTART.md](QUICKSTART.md) after install)

## Project Structure

```
BeakerStack/
├── apps/
│   ├── mobile/          # React Native (Expo)
│   └── web/             # React (Vite) web app
├── packages/
│   └── shared/          # Shared components, hooks, types
├── supabase/            # Database migrations, functions
├── tests/               # Integration & E2E tests
├── scripts/             # Development and setup scripts
└── docs/                # Documentation
```

## Development

### Useful scripts

- `npm run setup` — Interactive: local stack (default) or full cloud wizard
- `npm run setup:local` — Local only
- `npm run setup:full` — Cloud provisioning and optional `gh` sync
- `npm run dev:all` — Local Supabase + web + mobile
- `npm run test` / `npm run lint` / `npm run type-check` / `npm run format`

### Database

- `supabase start` / `supabase stop` — Local Supabase
- `npm run gen:types` — TypeScript types from DB
- `supabase db reset` — Reset local DB

### Testing

- `npm run test:unit` — Unit tests (mobile, web, shared, and `scripts/`)
- `npm run test:unit:scripts` — Repo script tests only (`scripts/__tests__/`, Node test runner)
- `npm run test:integration` — Integration tests
- `npm run test:e2e` — E2E (Maestro)
- `npm run test:db` — Database tests

### Development helper

- `npm run dev:check` / `npm run dev:clean` / `npm run dev:start`

### Mobile (from repo root)

- `npm run mobile` / `npm run mobile:ios` / `npm run mobile:android` / `npm run mobile:clean`

For **native clean rebuilds**, simulator uninstall, and `prebuild --clean`, see **[docs/guides/MOBILE.md](docs/guides/MOBILE.md)**.

## Deployment (CI/CD)

| Trigger               | Workflow                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| **Pull requests**     | [pr-preview-environment.yml](.github/workflows/pr-preview-environment.yml) |
| **Push to `develop`** | [deploy-staging.yml](.github/workflows/deploy-staging.yml)                 |
| **Push to `main`**    | [deploy-production.yml](.github/workflows/deploy-production.yml)           |

Details: [docs/pr-preview-setup.md](docs/pr-preview-setup.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

# Development

Day-to-day commands for working on BeakerStack (or a fork). For first-time setup, see [QUICKSTART.md](../QUICKSTART.md).

## Prerequisites

- **Node.js 20** recommended (`>=18` in root `package.json`), npm `>=9`
- **Docker Desktop** and **Supabase CLI** for local database/auth
- Native toolchains (Xcode, Android Studio) only if you build iOS/Android locally
- **Maestro** for `npm run test:e2e` (optional until you run E2E)

## Common scripts (repo root)

| Command                                                         | Purpose                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm run setup`                                                 | Interactive wizard: local stack (default) or full cloud                  |
| `npm run setup:local`                                           | Local Supabase + env only                                                |
| `npm run setup:full`                                            | Cloud provisioning, optional AWS bootstrap, optional `gh` secret sync    |
| `npm run dev:all`                                               | Local Supabase + web + mobile concurrently                               |
| `npm run web`                                                   | Vite dev server only                                                     |
| `npm run mobile`                                                | Expo dev server (port 8082)                                              |
| `npm run test`                                                  | Unit + integration + DB tests                                            |
| `npm run lint` / `npm run type-check` / `npm run format`        | Quality gates                                                            |
| `npm run dev:check` / `npm run dev:clean` / `npm run dev:start` | Environment helper ([`scripts/dev-helper.sh`](../scripts/dev-helper.sh)) |

## Database

- **Canonical migrations:** `supabase/migrations/` at the repository root
- `supabase start` / `supabase stop` — local Supabase
- `supabase migration new <name>` — new migration (from repo root)
- `supabase db reset` — reset local DB
- `npm run gen:types` — regenerate TypeScript types from schema

Mobile developers: see [`apps/mobile/supabase/migrations/README.md`](../apps/mobile/supabase/migrations/README.md) (migrations still live at repo root).

## Testing

| Command                     | Layer                                               |
| --------------------------- | --------------------------------------------------- |
| `npm run test:unit`         | Vitest across mobile, web, shared, billing, scripts |
| `npm run test:unit:scripts` | Repo script tests only                              |
| `npm run test:integration`  | Integration tests                                   |
| `npm run test:e2e`          | Maestro E2E                                         |
| `npm run test:db`           | Database tests (pgTAP)                              |
| `npm run test:all`          | `test` + E2E                                        |

Strategy and conventions: [TESTING.md](TESTING.md). OAuth testing: [testing/TESTING_OAUTH.md](testing/TESTING_OAUTH.md).

## Mobile

From the repo root:

- `npm run mobile` / `npm run mobile:ios` / `npm run mobile:android`
- `npm run mobile:clean` — stop Metro/Expo-related processes

Native rebuilds, simulator uninstall, `prebuild --clean`, and EAS flows: [guides/MOBILE.md](guides/MOBILE.md) and [MOBILE_BUILD_TESTING.md](MOBILE_BUILD_TESTING.md).

## Deployment (CI/CD)

| Trigger           | Workflow                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| Pull requests     | [pr-preview-environment.yml](../.github/workflows/pr-preview-environment.yml) |
| Push to `develop` | [deploy-staging.yml](../.github/workflows/deploy-staging.yml)                 |
| Push to `main`    | [deploy-production.yml](../.github/workflows/deploy-production.yml)           |

PR preview setup: [pr-preview-setup.md](pr-preview-setup.md). Environment design: [ARCHITECTURE.md](ARCHITECTURE.md).

## Branch flow

- Feature branches → PR into `develop` (squash merge)
- `develop` → promotion PR into `main` (merge commit)
- `main` → production deploys and npm package releases (when changesets are pending)

See [ARCHITECTURE.md](ARCHITECTURE.md#pull-request-process) and [CONTRIBUTING.md](../CONTRIBUTING.md).

## Documentation changes

Before merging doc-only PRs, run:

```bash
npm run docs:linkcheck
```

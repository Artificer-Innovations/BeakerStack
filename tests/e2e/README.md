# E2E tests (Maestro)

Cross-platform end-to-end tests for web (Chromium) and mobile (iOS/Android simulators).

## Layout

```
tests/e2e/
├── web/
│   ├── flows/       # Top-level web flows (run in CI)
│   └── subflows/    # Reusable steps
├── mobile/
│   ├── flows/
│   └── subflows/
└── shared/          # TypeScript fixtures (not executed by Maestro)
```

## Flows

| Flow                | Web | Mobile | Description                          |
| ------------------- | --- | ------ | ------------------------------------ |
| `landing`           | yes | yes    | Public home / marketing              |
| `signup`            | yes | yes    | Email signup → dashboard             |
| `login`             | yes | yes    | Seeded user login → dashboard        |
| `logout`            | yes | yes    | Login → sign out → public home       |
| `protected-routes`  | yes | —      | Unauthenticated `/dashboard` → login |
| `profile`           | yes | yes    | Edit display name                    |
| `dashboard-billing` | yes | yes    | Billing demo smoke                   |
| `forgot-password`   | yes | yes    | Reset form UI only                   |
| `home`              | yes | yes    | Legacy smoke (landing + signup)      |

## Environment variables

| Variable                              | Purpose                                                |
| ------------------------------------- | ------------------------------------------------------ |
| `WEB_URL`                             | Web app base URL (default `http://localhost:5173`)     |
| `MOBILE_APP_ID`                       | Mobile bundle id (default `com.anonymous.beakerstack`) |
| `TEST_EMAIL`                          | Unique email for signup flows                          |
| `TEST_PASSWORD` / `E2E_TEST_PASSWORD` | Password for signup and seeded login                   |
| `E2E_LOGIN_EMAIL`                     | Seeded login user (default `e2e-valid@example.com`)    |
| `PREVIEW_BOOTSTRAP_URL`               | Signed-cookie bootstrap link (PR previews)             |

## Local commands

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"

# Start Supabase + web, then seed login user and run web flows
npm run dev:supabase
npm run web   # separate terminal
export E2E_TEST_PASSWORD='your-local-e2e-password'
npm run test:e2e:seed
npm run test:e2e:web

# Full runner (local + optional mobile)
./scripts/run-e2e.sh local

# PR preview (requires PR_PREVIEW_DOMAIN)
PR_PREVIEW_DOMAIN=yourdomain.com ./scripts/run-e2e.sh pr 123
```

## CI (develop PRs)

- **`e2e-gate`** sets commit status `e2e` to **pending** on every push (merge blocked until E2E passes).
- **`e2e-run`** runs web Maestro tests when:
  - @ZappoMan **approves** the PR, or
  - Someone comments **`run e2e tests`** or **`/run e2e`**, or
  - Maintainers use **workflow_dispatch** with a PR number.

Configure branch protection on `develop` to require status check **`e2e`**.

Set GitHub secret **`E2E_TEST_PASSWORD`** (same value locally as `E2E_TEST_PASSWORD` in `.env`).

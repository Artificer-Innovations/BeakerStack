# Testing Guide

This document provides a comprehensive guide to testing in this project, covering unit tests, integration tests, E2E tests, and database tests.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Organization](#test-organization)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Database Tests](#database-tests)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

This project uses a **hybrid testing approach**:

1. **Unit tests are colocated** with the code they test (industry standard), including repo tooling under `scripts/__tests__/` (Node’s built-in test runner, not Jest/Vitest)
2. **Integration and E2E tests are centralized** in `tests/` (they test the whole system)
3. **Database tests follow Supabase convention** in `supabase/tests/` (required by tooling)

**Rationale:**

- Unit tests benefit from proximity to source code (shorter imports, clear ownership)
- System-level tests (E2E, integration) don't belong to one app - they test everything together
- A solo developer can easily find all E2E tests in one place: `tests/e2e/`
- Clear separation between "test this function" vs "test this user flow across web + mobile + database"

## Test Organization

### Where Tests Live

```
Unit Tests (Colocated with Code)
├── apps/mobile/__tests__/          → Mobile-specific component/screen tests
├── apps/web/__tests__/              → Web-specific component/page tests
├── packages/shared-tests/__tests__/ → Shared component/hook/util tests
└── scripts/__tests__/               → Repo scripts (setup, rename, manifest, etc.) via `node --test`; PR-preview shell self-test is invoked from `npm run test:unit:scripts`

Integration Tests (Centralized)
└── tests/integration/               → Cross-platform integration tests

E2E Tests (Centralized)
├── tests/e2e/web/                   → Web user flow tests
├── tests/e2e/mobile/                → Mobile user flow tests
└── tests/e2e/shared/                → Shared E2E utilities

Database Tests (Supabase Convention)
└── supabase/tests/                  → SQL-based database tests
```

### Decision Matrix

Use this decision tree to determine where a test should live:

```
Is it testing a single function/component in isolation?
├─ YES → Unit test (colocated with code)
│   ├─ Mobile-specific? → apps/mobile/__tests__/
│   ├─ Web-specific? → apps/web/__tests__/
│   ├─ Shared code? → packages/shared-tests/__tests__/
│   └─ Repo / provisioning script logic (Node `.mjs` under `scripts/`)? → scripts/__tests__/
│
└─ NO → Continue...

Is it testing multiple systems working together?
├─ YES → Integration test
│   └─ tests/integration/
│
└─ NO → Continue...

Is it testing end-to-end user flows?
├─ YES → E2E test
│   ├─ Web flows? → tests/e2e/web/
│   └─ Mobile flows? → tests/e2e/mobile/
│
└─ NO → Continue...

Is it testing database logic (RLS, triggers, functions)?
└─ YES → Database test
    └─ supabase/tests/
```

## Unit Tests

### What to Test

- Component rendering and props
- Hook logic (useAuth, useProfile, etc.)
- Utility functions
- Form validation
- Data transformations
- Platform-specific logic
- Repo script behavior (setup, rename, secrets input, etc.) in `scripts/__tests__/` using `node --test`

### Running Unit Tests

```bash
# Run all unit tests (apps, packages, and repo scripts under scripts/)
npm run test:unit

# Run unit tests for a specific app or package
npm run test:unit:mobile
npm run test:unit:web
npm run test:unit:shared
npm run test:unit:billing
npm run test:unit:admin
npm run test:unit:lifecycle-events
npm run test:unit:waitlist
npm run test:unit:email

# Run only repo script unit tests (node --test on scripts/__tests__ plus PR-preview shell self-test)
npm run test:unit:scripts

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Example Unit Test

```typescript
// packages/shared/__tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';

describe('useAuth', () => {
  it('returns user after successful auth', async () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
  });
});
```

## Integration Tests

Jest integration tests live in `tests/integration/` and run against a **real local Supabase** stack (`supabase start`). They validate authenticated client behavior (Auth, RLS, RPCs, Storage)—not UI flows (see E2E) and not schema contracts alone (see Database Tests).

**Prerequisites:** `supabase start` from the repo root. Optional env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (defaults to CLI demo keys on `127.0.0.1:54321`).

### Suite layout (Tier 1 — default CI)

| File                              | Coverage                                                           |
| --------------------------------- | ------------------------------------------------------------------ |
| `auth.test.ts`                    | Signup, sign-in/out, session, profile read                         |
| `auth-rls.test.ts`                | `user_profiles` RLS (cross-user read/update/delete, anon read)     |
| `profile-sync.test.ts`            | Web + mobile clients, bio sync, independent sign-out               |
| `billing-entitlements.test.ts`    | `ensure_billing_subscription`, usage RPCs, demo upgrade, RLS       |
| `billing-usage-lifecycle.test.ts` | Demo usage reset, demo collections, subscription row after upgrade |
| `waitlist-flow.test.ts`           | Capture, settings, admin approve, invite validate/consume          |
| `admin-access.test.ts`            | `admin_is_admin`, `admin_list_users`, audit log, revoke            |
| `storage-avatars.test.ts`         | Avatars bucket upload RLS, profile `avatar_url` sync               |

Tier 1 runs in the main [Test workflow](../.github/workflows/test.yml) after `supabase start` (Edge runtime excluded for speed).

### Tier 2 — Edge + Stripe (optional)

| File                     | Coverage                                 |
| ------------------------ | ---------------------------------------- |
| `billing-edge.test.ts`   | `billing-stripe` Edge Function           |
| `waitlist-edge.test.ts`  | `waitlist-capture` / `waitlist-ops` HTTP |
| `stripe-webhook.test.ts` | Webhook signature rejection              |

Triggered manually or on schedule via [integration-edge.yml](../.github/workflows/integration-edge.yml). Optional GitHub secrets: `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`.

### Running Integration Tests

```bash
# Tier 1 (default PR/local)
npm run test:integration

# Tier 2 Edge tests (local)
npm run test:integration:edge
```

Locally, `test:integration:edge` runs [`scripts/run-integration-edge-tests.sh`](../scripts/run-integration-edge-tests.sh), which:

1. Starts Supabase if it is not running (`supabase start`, with Edge runtime).
2. Starts `supabase functions serve` in the background if functions are not reachable (uses `supabase/.env.local` when present).
3. Runs the Edge Jest suites, then stops only the functions process it started.

If Supabase is already up from `supabase start -x edge-runtime`, restart without excluding Edge runtime, or run `supabase stop && supabase start` before Edge tests.

Optional: put `STRIPE_SECRET_KEY` (and related vars) in `supabase/.env.local` for the billing checkout Edge test.

### Test utilities

| Module                    | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `test-clients.ts`         | Web, mobile, and service-role Supabase clients                   |
| `test-helpers.ts`         | `createTestUser`, `signInTestUser`, `cleanupTestData`, etc.      |
| `test-database.ts`        | Config, `waitFor`, retries                                       |
| `integration-fixtures.ts` | Admin grant/revoke, waitlist capture/mode, service-role teardown |
| `billing-fixtures.ts`     | Demo billing RPC wrappers                                        |
| `integration-setup.ts`    | Jest `beforeAll` Supabase reachability check                     |
| `mock-supabase.ts`        | Mocks for **unit** tests only                                    |

### Coverage

Integration tests **do not** contribute to `npm run test:coverage` or merged `coverage/coverage-summary.json`. Use unit/workspace coverage for line metrics; use integration tests for runtime Supabase behavior.

### Relationship to other layers

- **pgTAP (`npm run test:db`):** migration contracts, policy existence, SQL-only matrices.
- **E2E (`npm run test:e2e`):** Maestro UI journeys (separate from this suite).

## E2E Tests

### What to Test

- Complete user flows on web application
- Complete user flows on mobile application
- Critical user journeys (login, signup, profile management)
- Cross-platform functionality

### Prerequisites

1. **Install Maestro CLI:**

   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   export PATH="$HOME/.maestro/bin:$PATH"
   ```

2. **For Web E2E Tests:**
   - Web app must be running or deployed
   - Set `WEB_URL` environment variable

3. **For Mobile E2E Tests:**
   - App must be built and installed on device/simulator
   - Simulator/emulator must be running
   - Set `MOBILE_APP_ID` environment variable (defaults to `com.anonymous.beakerstack`)

### Running E2E Tests

**Before running E2E tests:**

1. **Ensure Maestro is installed:**

   ```bash
   # If not already installed:
   curl -Ls "https://get.maestro.mobile.dev" | bash
   export PATH="$PATH:$HOME/.maestro/bin"
   ```

2. **Set required environment variables:**

   ```bash
   # Set web URL (for web tests) - defaults to http://localhost:5173 if not set
   export WEB_URL="http://localhost:5173"

   # Set test credentials (password optional — npm scripts and run-e2e.sh pick a random one if unset)
   export TEST_EMAIL="e2e-test-$(date +%s)@example.com"
   export TEST_PASSWORD="E2e_$(openssl rand -hex 16)_Aa1"

   # Set mobile app ID (for mobile tests)
   export MOBILE_APP_ID="com.anonymous.beakerstack"
   ```

3. **Ensure the web app is running** (for web E2E tests):

   ```bash
   npm run web
   ```

4. **Build and install the mobile app** (for mobile E2E tests):

   **For iOS:**

   ```bash
   # Make sure an iOS simulator is running
   # Open Simulator app or run: open -a Simulator

   # Build and install the app
   cd apps/mobile
   npm run ios
   # Or from root: npm run mobile:ios
   ```

   **For Android:**

   ```bash
   # Make sure an Android emulator is running
   # Start from Android Studio or run: emulator -avd <avd_name>

   # Build and install the app
   cd apps/mobile
   npm run android
   # Or from root: npm run mobile:android
   ```

   **Note:** The app only needs to be built and installed once. After that, you can run E2E tests multiple times without rebuilding (unless you change native code).

**Then run tests:**

```bash
# Run all E2E tests
npm run test:e2e

# Run web E2E tests only
npm run test:e2e:web

# Run mobile E2E tests only
# Prerequisites: App must be built and installed, simulator/emulator must be running
npm run test:e2e:mobile

# Or run directly with Maestro (with custom app ID)
export PATH="$PATH:$HOME/.maestro/bin"
maestro test tests/e2e/mobile/flows/home.yaml \
 --env MOBILE_APP_ID="com.anonymous.beakerstack" \
  --env TEST_EMAIL="e2e-test-$(date +%s)@example.com" \
  --env TEST_PASSWORD="E2e_$(openssl rand -hex 16)_Aa1"

# Run against specific environment (script sets env vars automatically)
./scripts/run-e2e.sh local
./scripts/run-e2e.sh pr 123
./scripts/run-e2e.sh staging
./scripts/run-e2e.sh production
```

### E2E Test Structure

E2E tests are written in YAML format using Maestro:

```yaml
# tests/e2e/web/flows/home.yaml
url: ${WEB_URL} # Use 'url:' for web, 'appId:' for mobile
---
- launchApp
- waitForAnimationToEnd
- assertVisible: 'Welcome to Beaker Stack'
- assertVisible: 'Sign Up'
- tapOn: 'Sign Up'
- waitForAnimationToEnd
- assertVisible: 'Create your account'
- inputText:
    id: 'email'
    text: '${TEST_EMAIL}'
- inputText:
    id: 'password'
    text: '${TEST_PASSWORD}'
- inputText:
    id: 'confirm-password'
    text: '${TEST_PASSWORD}'
- tapOn: 'Create account'
- waitForAnimationToEnd
- takeScreenshot: 'after-signup'
```

### E2E Test Utilities

Shared utilities are available in `tests/e2e/shared/`:

- `test-data.ts` - Test data generators
- `fixtures.ts` - Test fixtures and selectors
- `helpers.ts` - Helper functions

## Database Tests

### What to Test

- Row Level Security (RLS) policies
- Database triggers and functions
- Table constraints and relationships
- Storage bucket policies

### Running Database Tests

```bash
# Run all database tests
npm run test:db

# Run specific test file
supabase test db --file supabase/tests/rls_policies.test.sql
```

### Database Test Structure

Database tests use pgTAP format:

```sql
-- supabase/tests/rls_policies.test.sql
BEGIN;

SELECT plan(5);

-- Test 1: Verify RLS is enabled
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'user_profiles'
    AND relrowsecurity = true
  ),
  'RLS should be enabled on user_profiles table'
);

-- More tests...

ROLLBACK;
```

### Available Database Tests

- `test_user_profiles.sql` - User profiles table schema and constraints
- `test_user_creation_trigger.sql` - User creation trigger tests
- `rls_policies.test.sql` - Comprehensive RLS policy tests
- `storage_policies.test.sql` - Storage bucket policy tests

## Running Tests

### All Tests

```bash
# Run all tests (unit + integration + database)
npm test

# Run all tests including E2E
npm run test:all
```

### Individual Test Types

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Database tests
npm run test:db

# E2E tests
npm run test:e2e
```

### Watch Mode

```bash
# Watch mode for unit tests
npm run test:watch
```

### Coverage

**Prerequisites:**

- ✅ `@vitest/coverage-v8` is installed for Vitest-based apps and packages (`apps/web`, `packages/billing`, `packages/admin`, `packages/waitlist`, `packages/email`, `packages/lifecycle-events`, `packages/observability`)
- ✅ Jest coverage is configured for `apps/mobile` and `packages/shared-tests` (which instruments `packages/shared/src`)
- ✅ `scripts/merge-coverage.js` merges per-workspace reports into `coverage/coverage-summary.json`

```bash
# Generate coverage for all workspaces and merge into one summary
npm run test:coverage
```

**Per-workspace coverage directories** (HTML, JSON, LCOV under each `coverage/` folder):

| Workspace                   | Runner | Source under test                        |
| --------------------------- | ------ | ---------------------------------------- |
| `apps/web`                  | Vitest | `apps/web/src`                           |
| `apps/mobile`               | Jest   | `apps/mobile/src`                        |
| `packages/shared-tests`     | Jest   | `packages/shared/src` (via shared-tests) |
| `packages/billing`          | Vitest | `packages/billing/src`                   |
| `packages/admin`            | Vitest | `packages/admin/src`                     |
| `packages/waitlist`         | Vitest | `packages/waitlist/src`                  |
| `packages/email`            | Vitest | `packages/email/src`                     |
| `packages/lifecycle-events` | Vitest | `packages/lifecycle-events/src`          |
| `packages/observability`    | Vitest | `packages/observability/src`             |

**Running Coverage:**

```bash
# Full monorepo: all workspaces above, then merge
npm run test:coverage

# This will:
# 1. Run coverage for each app/package listed in root package.json test:coverage:*
# 2. Merge all reports via scripts/merge-coverage.js
# 3. Print a summary and write coverage/coverage-summary.json

# Individual workspaces
npm run test:coverage:web
npm run test:coverage:mobile
npm run test:coverage:shared
npm run test:coverage:billing
npm run test:coverage:admin
npm run test:coverage:lifecycle-events
npm run test:coverage:waitlist
npm run test:coverage:email
npm run test:coverage:observability

# Re-merge existing coverage/ dirs without re-running tests
npm run test:coverage:merge
```

**Viewing Coverage Reports:**

After running `npm run test:coverage`, you'll get:

1. **Integrated summary** (terminal + `coverage/coverage-summary.json`):
   - Overall merged coverage across all workspaces
   - Per-workspace breakdown (web, mobile, shared, billing, admin, lifecycle-events, waitlist, email, observability)
   - Statements, branches, functions, and lines

2. **Individual HTML reports** (open each workspace's `coverage/index.html`):
   - Apps: `apps/web/coverage/`, `apps/mobile/coverage/`
   - Shared: `packages/shared-tests/coverage/` (covers `packages/shared`)
   - Packages: `packages/billing/coverage/`, `packages/admin/coverage/`, `packages/lifecycle-events/coverage/`, `packages/waitlist/coverage/`, `packages/email/coverage/`, `packages/observability/coverage/`

**Open reports in browser:**

```bash
# View integrated summary
cat coverage/coverage-summary.json

# macOS — example (any workspace)
open apps/web/coverage/index.html
open packages/billing/coverage/index.html
open packages/lifecycle-events/coverage/index.html

# Linux
xdg-open apps/web/coverage/index.html
xdg-open packages/billing/coverage/index.html
```

**Important Note on Web E2E Tests:**

✅ **Maestro supports web testing** (in beta) using Chromium. Use `url:` instead of `appId:` in your test files.

**Current limitations:**

- Chromium-only (no Firefox/WebKit support yet)
- Default `en-US` locale
- Limited screen-size configuration options

**When to use Maestro for web:**

- You want one YAML framework across mobile + web
- Chromium-only testing is acceptable
- You like the Studio recorder/inspector

**When to use Playwright/Cypress instead:**

- You need cross-browser coverage (Chromium + WebKit + Firefox)
- You need more mature React-web testing ergonomics

**Troubleshooting:**

If coverage reports don't appear:

1. **Verify dependencies are installed:**

   ```bash
   npm install
   ```

2. **Check coverage directories exist after running tests:**

   ```bash
   ls -la apps/web/coverage/ apps/mobile/coverage/
   ls -la packages/shared-tests/coverage/
   ls -la packages/billing/coverage/ packages/admin/coverage/
   ls -la packages/lifecycle-events/coverage/ packages/waitlist/coverage/ packages/email/coverage/ packages/observability/coverage/
   ```

3. **Run tests individually to see errors:**

   ```bash
   npm run test:coverage:web
   npm run test:coverage:mobile
   npm run test:coverage:shared
   npm run test:coverage:billing
   npm run test:coverage:admin
   npm run test:coverage:lifecycle-events
   npm run test:coverage:waitlist
   npm run test:coverage:email
   npm run test:coverage:observability
   ```

4. **For web app coverage issues:** Ensure `@vitest/coverage-v8` is installed:
   ```bash
   cd apps/web
   npm list @vitest/coverage-v8
   ```

## Writing Tests

### Unit Test Example

```typescript
// apps/web/__tests__/pages/LoginPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '../../src/pages/LoginPage'

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
  })

  it('shows error on invalid input', async () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Sign in'))
    expect(await screen.findByText('Please fill in all fields')).toBeInTheDocument()
  })
})
```

### Integration Test Example

```typescript
// tests/integration/profile-sync.test.ts
import {
  createWebTestClient,
  createMobileTestClient,
} from '../utils/test-clients';
import { createTestUser, signInTestUser } from '../utils/test-helpers';

describe('Profile Sync', () => {
  it('should sync profile updates across platforms', async () => {
    const webClient = createWebTestClient();
    const mobileClient = createMobileTestClient();

    const { userId, email, password } = await createTestUser(webClient);
    await signInTestUser(mobileClient, email, password);

    // Update profile on web
    await webClient
      .from('user_profiles')
      .update({ bio: 'Updated from web' })
      .eq('user_id', userId);

    // Verify update visible on mobile
    const { data } = await mobileClient
      .from('user_profiles')
      .select('bio')
      .eq('user_id', userId)
      .single();

    expect(data?.bio).toBe('Updated from web');
  });
});
```

### E2E Test Example

```yaml
# tests/e2e/web/flows/signup.yaml
appId: ${WEB_URL}
---
- launchApp
- tapOn: "Don't have an account? Sign up"
- assertVisible: 'Create your account'
- inputText:
    id: 'email'
    text: '${TEST_EMAIL}'
- inputText:
    id: 'password'
    text: '${TEST_PASSWORD}'
- inputText:
    id: 'confirm-password'
    text: '${TEST_PASSWORD}'
- tapOn: 'Create account'
- assertVisible: 'Dashboard'
- takeScreenshot: 'after-signup'
```

## Best Practices

### Unit Tests

1. **Test behavior, not implementation** - Focus on what the user sees/does
2. **Use descriptive test names** - "should display error when email is invalid"
3. **Keep tests isolated** - Each test should work independently
4. **Mock external dependencies** - Mock Supabase in unit tests
5. **Test edge cases** - Invalid input, empty states, error conditions

### Integration Tests

1. **Use real Supabase client** - Integration tests should use real database
2. **Clean up test data** - Always clean up after tests
3. **Use test utilities** - Leverage helpers from `tests/utils/`
4. **Test cross-platform sync** - Verify data syncs between web and mobile
5. **Test error scenarios** - Network failures, invalid data, etc.

### E2E Tests

1. **Test critical user journeys** - Focus on most important flows
2. **Use environment variables** - Make tests work across environments
3. **Take screenshots** - Helpful for debugging and documentation
4. **Keep tests independent** - Each test should work standalone
5. **Use shared utilities** - Leverage `tests/e2e/shared/` helpers

### Database Tests

1. **Test all RLS policies** - Every policy should have tests
2. **Test constraints** - Verify table constraints work correctly
3. **Test triggers** - Verify triggers execute as expected
4. **Use transactions** - Wrap tests in BEGIN/ROLLBACK
5. **Test edge cases** - Invalid data, null values, etc.

## Troubleshooting

### Unit Tests

**Problem:** Tests fail with "Cannot find module" errors

- **Solution:** Check path aliases in `tsconfig.json` and Jest config

**Problem:** Tests timeout

- **Solution:** Increase timeout in Jest config or use `jest.setTimeout()`

**Problem:** Mock not working

- **Solution:** Ensure mocks are in `__mocks__/` directory or use `jest.mock()`

### Integration Tests

**Problem:** Tests fail with "Connection refused"

- **Solution:** Ensure Supabase local is running: `supabase start`

**Problem:** Tests leave data in database

- **Solution:** Use cleanup functions from `tests/utils/test-helpers.ts`

**Problem:** Tests are flaky

- **Solution:** Add proper waits and retries using `waitFor` from test utilities

### E2E Tests

**Problem:** Maestro not found

- **Solution:** Install Maestro: `curl -Ls "https://get.maestro.mobile.dev" | bash`

**Problem:** Web tests fail - "Cannot connect to server"

- **Solution:** Ensure web dev server is running: `npm run web`

**Problem:** Mobile tests fail - "App not installed"

- **Solution:** Build and install app: `npm run mobile:ios` or `npm run mobile:android`

**Problem:** Tests timeout

- **Solution:** Increase wait times or check if app is responding

**Problem:** Mobile E2E tests fail with "Unable to launch app"

- **Solution:**
  - Ensure the app is built and installed: `cd apps/mobile && npm run ios` (or `npm run android`)
  - Ensure a simulator/emulator is running:
    - iOS: Open Simulator app or check with `xcrun simctl list devices | grep Booted`
    - Android: Check with `adb devices` (should show a device)
- Verify the app ID matches: `com.anonymous.beakerstack` (or set `MOBILE_APP_ID` env var)
- Try uninstalling and reinstalling: `cd apps/mobile && npm run ios:uninstall && npm run ios`

**Problem:** "Invalid File Path" error with runScript

- **Solution:** Maestro doesn't support `runScript`. Set environment variables before running tests:
  ```bash
  export TEST_EMAIL="e2e-test-$(date +%s)@example.com"
  export TEST_PASSWORD="E2e_$(openssl rand -hex 16)_Aa1"
  npm run test:e2e:web
  ```

**Problem:** Web tests fail with "Unable to launch app"

- **Solution:**
  - Use `url:` instead of `appId:` in web test YAML files
  - Ensure `WEB_URL` environment variable is set
  - Ensure the web app is running at the specified URL

**Problem:** Assertions fail with "Element not visible"

- **Solution:**
  - Check the actual UI text/selectors in your app - they may differ from test expectations
  - Use Maestro Studio to record and inspect: `maestro -p web studio`
  - Check debug artifacts in `~/.maestro/tests/` for screenshots and UI hierarchy

### Database Tests

**Problem:** Tests fail with "relation does not exist"

- **Solution:** Ensure migrations are applied: `supabase db reset`

**Problem:** Tests fail with permission errors

- **Solution:** Check RLS policies are correctly configured

**Problem:** Tests are slow

- **Solution:** Use transactions (BEGIN/ROLLBACK) to avoid actual data changes

**Problem:** Database tests fail with type errors (e.g., "function is(bigint, integer) does not exist")

- **Solution:** Ensure proper type casting in pgTAP tests. Use `::bigint` for bigint comparisons:
  ```sql
  SELECT is(
    (SELECT file_size_limit::bigint FROM storage.buckets WHERE id = 'avatars'),
    2097152::bigint,
    'avatars bucket should have 2MB file size limit'
  );
  ```

**Problem:** Database tests fail when Supabase is already running

- **Solution:** Database tests work with Supabase running. The error is likely a test syntax issue, not a conflict with running Supabase.

## CI/CD Integration

Tests are automatically run in CI/CD:

- **On every PR:** Unit tests, integration tests, database tests
- **After PR preview deployment:** E2E tests against preview environment
- **On merge to develop:** All tests + staging E2E tests
- **On merge to main:** All tests + production smoke tests

See `.github/workflows/test.yml` for test workflow configuration.

## Additional Resources

- [OAuth testing notes](testing/TESTING_OAUTH.md)
- [Protected routes — manual checks](testing/TESTING_PROTECTED_ROUTES.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Maestro Documentation](https://maestro.mobile.dev/)
- [Supabase Testing](https://supabase.com/docs/guides/cli/local-development#testing)
- [pgTAP Documentation](https://pgtap.org/)

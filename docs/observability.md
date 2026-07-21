# Observability

BeakerStack ships a first-party `@beakerstack/observability` package that wraps [Sentry](https://sentry.io) with PII scrubbing, config validation, and a consistent API across web, React Native, and Supabase Edge Functions.

## Quick start

### 1. Set environment variables (optional locally)

| Platform      | Variable                         | Purpose                                                                 |
| ------------- | -------------------------------- | ----------------------------------------------------------------------- |
| Web (Vite)    | `VITE_SENTRY_DSN`                | Sentry project DSN                                                      |
| Web           | `VITE_SENTRY_ENVIRONMENT`        | Override environment tag (CI sets `preview` / `staging` / `production`) |
| Web           | `VITE_SENTRY_RELEASE`            | Release id for source map linking (CI typically sets `github.sha`)      |
| Mobile (Expo) | `EXPO_PUBLIC_SENTRY_DSN`         | Sentry project DSN                                                      |
| Mobile        | `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | Override environment tag                                                |
| Mobile        | `EXPO_PUBLIC_SENTRY_RELEASE`     | Release id for native source maps                                       |

Add web vars to `apps/web/.env.local` and mobile vars to `apps/mobile/.env.local`. See [env.example](../env.example). **Leave DSN empty to disable Sentry** — the package is a no-op when no DSN is provided.

### 2. Web — wired in the template

| Piece          | Location                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| Init           | `apps/web/src/main.tsx` — `initObservability()` before render                              |
| Provider       | `apps/web/src/main.tsx` — `ObservabilityProvider` wraps the app                            |
| Error boundary | `apps/web/src/App.tsx` — `AppErrorBoundary` (Sentry capture + reload fallback)             |
| Auth user sync | `apps/web/src/AuthenticatedApp.tsx` — `ObservabilityUserSync` sets hashed user id on login |
| Config         | `apps/web/src/config/observability.ts`                                                     |

Dependencies: `@beakerstack/observability`, `@sentry/react` (direct dep on `web` for production builds).

### 3. Mobile — wired in the template

| Piece          | Location                                                                         |
| -------------- | -------------------------------------------------------------------------------- |
| Init           | `apps/mobile/index.js` — `initObservability()` before `registerRootComponent`    |
| Provider       | `apps/mobile/App.tsx` — `ObservabilityProvider` + shared `navigationRef`         |
| Error boundary | `apps/mobile/App.tsx` — `AppErrorBoundary` (Sentry capture + try-again fallback) |
| Auth user sync | `apps/mobile/App.tsx` — `ObservabilityUserSync`                                  |
| Config         | `apps/mobile/src/config/observability.ts`                                        |

Dependencies: `@beakerstack/observability`, `@sentry/react-native`.

Navigation instrumentation uses `apps/mobile/src/navigation/navigationRef.ts` passed to `ObservabilityProvider`.

### 4. Edge Functions

```ts
import {
  initEdgeObservability,
  withEdgeScope,
  captureEdgeException,
} from '../_shared/observability.ts';

initEdgeObservability({
  project: 'my-fn',
  environment: Deno.env.get('ENVIRONMENT') ?? 'development',
});

Deno.serve(
  withEdgeScope(async req => {
    // ... handler
    return new Response('ok');
  })
);
```

> **Note:** The Sentry Node/browser SDKs are not compatible with the Deno runtime. `withEdgeScope` is currently a pass-through wrapper. A Deno-compatible Sentry SDK can be substituted in `supabase/functions/_shared/observability.ts` without touching call-sites.

## Configuration reference

```ts
interface ObservabilityConfig {
  project: string; // logical project name (e.g. "beakerstack", "beakerstack-mobile")
  environment: string; // "development" | "preview" | "staging" | "production"
  dsn?: string; // Sentry DSN — omit to disable
  release?: string; // commit SHA or semver; must match CI source map upload
  sampling?: {
    traces?: number; // default 0.1 (10 %)
    replayOnError?: number; // default 1.0 (100 %) — fraction of error sessions captured as replay
    replay?: number; // default 0.0 (disabled)
  };
  pii?: {
    captureIp?: boolean; // default false — strips IP from Sentry events
  };
}
```

## Deployed environments (CI / EAS)

Staging, production, and PR preview web deploys pass `VITE_SENTRY_*` when GitHub secrets are set. Staging/production also upload source maps via `@sentry/vite-plugin` when `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` are present.

| GitHub setting          | Kind     | Used for                                          |
| ----------------------- | -------- | ------------------------------------------------- |
| `STAGING_SENTRY_DSN`    | secret   | `VITE_SENTRY_DSN` on staging + PR preview         |
| `PRODUCTION_SENTRY_DSN` | secret   | `VITE_SENTRY_DSN` on production                   |
| `SENTRY_AUTH_TOKEN`     | secret   | Vite plugin source map upload (staging/prod only) |
| `SENTRY_ORG`            | variable | Sentry org slug                                   |
| `SENTRY_PROJECT`        | variable | Sentry project slug                               |

Workflow mapping:

- **staging** (`deploy-staging.yml`): `VITE_SENTRY_ENVIRONMENT=staging`, release=`github.sha`
- **production** (`deploy-production.yml`): `VITE_SENTRY_ENVIRONMENT=production`
- **PR preview** (`pr-preview-environment.yml`): reuses `STAGING_SENTRY_DSN` with `VITE_SENTRY_ENVIRONMENT=preview` (no source-map upload)

EAS / mobile: set `EXPO_PUBLIC_SENTRY_*` in `eas.json` / EAS secrets when enabling native crash reporting.

## Crash symbolication (source maps)

Staging and production builds enable `@sentry/vite-plugin` when auth token, org, project, and release are all set. Maps are generated as `hidden` sourcemaps and deleted after upload (`filesToDeleteAfterUpload`) so `.map` files are not published to S3.

The SDK `release` field (`VITE_SENTRY_RELEASE`) must match the release name used at upload time — workflows set both to `${{ github.sha }}`.

Set `EXPO_PUBLIC_SENTRY_RELEASE` at mobile build time to match if uploading native symbols separately.

## Sampling and spend control

The defaults are conservative:

| Signal         | Default | Env to watch                                 |
| -------------- | ------- | -------------------------------------------- |
| Traces         | 10 %    | Raise carefully — transactions are expensive |
| Errors         | 100 %   | Lower only if error volume is extremely high |
| Session replay | 0 %     | Enable explicitly; billed per session        |

Override per-environment in `apps/web/src/config/observability.ts` or `apps/mobile/src/config/observability.ts`.

## PII scrubbing

The package scrubs PII before sending to Sentry:

- **User IDs** — hashed with SHA-256 before being set on the Sentry scope via `setUser`. Raw user IDs are never sent. `ObservabilityUserSync` calls `setUser` on auth session changes.
- **Email addresses** — scrubbed from breadcrumb messages (replaced with `[email]`).
- **IP addresses** — stripped from Sentry events unless `pii.captureIp: true`.

The scrubbing utilities are exported from the package root for use in other contexts:

```ts
import { hashUserId, scrubEmail } from '@beakerstack/observability';
```

## Using the hook

Within any component wrapped by `ObservabilityProvider`:

```tsx
import { useObservability } from '@beakerstack/observability/web';

function MyComponent() {
  const obs = useObservability();

  obs.setUser('user-uuid-123');  // hashed automatically
  obs.addBreadcrumb({ message: 'User opened checkout', category: 'ui' });

  try { ... } catch (err) {
    obs.captureException(err);
  }
}
```

Auth user sync is already handled by `ObservabilityUserSync` on web and mobile; use the hook for custom breadcrumbs or manual captures.

## Disabling in tests

Tests that don't mock `@sentry/react` / `@sentry/react-native` use no-op stubs when no DSN is present. App tests mock `@beakerstack/observability/web` or `/native` — see `apps/web/src/__tests__/main.test.tsx` and `apps/mobile/__tests__/App.test.tsx`. Package tests mock Sentry directly — see the [TDZ-safe mock pattern](../packages/observability/src/__tests__/init.web.test.ts).

## Sentry project layout (recommended)

- **One Sentry organization** per company (e.g. Artificer Innovations)
- **One Sentry project per product** (e.g. `beakerstack` for web + mobile)
- **Environments** inside that project: `development`, `preview`, `staging`, `production` (via `VITE_SENTRY_ENVIRONMENT` / `EXPO_PUBLIC_SENTRY_ENVIRONMENT`)

Web and mobile can share the same DSN; Sentry tags events by platform (`javascript` vs `react-native`).

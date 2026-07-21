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

Local wiring is complete in the template. **Preview, staging, and production** require build-time secrets and workflow changes — tracked in [GitHub issue #299](https://github.com/Artificer-Innovations/BeakerStack/issues/299) (`setup:sentry` wizard):

- GitHub secrets: `PREVIEW_SENTRY_DSN`, `STAGING_SENTRY_DSN`, `PRODUCTION_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- Workflow env: `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE` on web deploy jobs
- EAS: `EXPO_PUBLIC_SENTRY_DSN` and related vars in `eas.json` / EAS secrets
- Post-build source map upload via `@sentry/cli`

Until #299 lands, deployed web/mobile builds will not report to Sentry unless you set secrets manually.

## Sampling and spend control

The defaults are conservative:

| Signal         | Default | Env to watch                                 |
| -------------- | ------- | -------------------------------------------- |
| Traces         | 10 %    | Raise carefully — transactions are expensive |
| Errors         | 100 %   | Lower only if error volume is extremely high |
| Session replay | 0 %     | Enable explicitly; billed per session        |

Override per-environment in `apps/web/src/config/observability.ts` or `apps/mobile/src/config/observability.ts`.

## Product analytics (Plausible)

BeakerStack uses **`@beakerstack/analytics`** for privacy-oriented **web traffic** metrics (unique visitors, pageviews, top pages). This is separate from Sentry:

| Concern                        | Package                      | Env (web)                 |
| ------------------------------ | ---------------------------- | ------------------------- |
| Errors, performance, replay    | `@beakerstack/observability` | `VITE_SENTRY_DSN`         |
| Pageviews, visitors, referrers | `@beakerstack/analytics`     | `VITE_PLAUSIBLE_DOMAIN`   |
| Event API (optional proxy)     | `@beakerstack/analytics`     | `VITE_PLAUSIBLE_ENDPOINT` |

Uses Plausible **v2** via `@plausible-analytics/tracker` (bundled at build time — no external script tag). `<PlausibleAnalytics />` in `App.tsx` calls `init()` once; SPA pageviews use the tracker's history hooks. Admin routes (`/admin`) are excluded by default.

| Piece       | Location                                                                               |
| ----------- | -------------------------------------------------------------------------------------- |
| Package     | `packages/analytics` — `@beakerstack/analytics/web`                                    |
| Config      | `apps/web/src/config/analytics.ts`                                                     |
| Client init | `apps/web/src/App.tsx` — `<PlausibleAnalytics config={analyticsConfig} />`             |
| CSP         | `infra/aws/pr-preview-stack.yml` — `connect-src` includes `https://plausible.io` (API) |

Leave `VITE_PLAUSIBLE_DOMAIN` empty locally to disable. For local testing, set domain plus `VITE_PLAUSIBLE_CAPTURE_ON_LOCALHOST=true`. Hosted: production uses `vars.PR_PREVIEW_DOMAIN` (apex); staging and PR preview use `staging.{domain}` / `deploy.{domain}`.

## PII scrubbing

The package scrubs PII before sending to Sentry:

- **User IDs** — hashed with SHA-256 before being set on the Sentry scope via `setUser`. Raw user IDs are never sent. `ObservabilityUserSync` calls `setUser` on auth session changes.
- **Email addresses** — scrubbed from breadcrumb messages (replaced with `[email]`).
- **IP addresses** — stripped from Sentry events unless `pii.captureIp: true`.

The scrubbing utilities are exported from the package root for use in other contexts:

```ts
import { hashUserId, scrubEmail } from '@beakerstack/observability';
```

## Crash symbolication (source maps)

To get human-readable stack traces in Sentry you need to upload source maps as part of CI. The SDK `release` field must match the release id used at upload time.

```yaml
# .github/workflows/deploy.yml (example — see #299 for full wiring)
- name: Upload source maps to Sentry
  run: npx @sentry/cli releases files "$RELEASE" upload-sourcemaps ./dist
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: beakerstack
    RELEASE: ${{ github.sha }}
```

Set `VITE_SENTRY_RELEASE=${{ github.sha }}` (web) and `EXPO_PUBLIC_SENTRY_RELEASE` (mobile) at build time to match.

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

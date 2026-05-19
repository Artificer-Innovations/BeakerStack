# Observability

BeakerStack ships a first-party `@beakerstack/observability` package that wraps [Sentry](https://sentry.io) with PII scrubbing, config validation, and a consistent API across web, React Native, and Supabase Edge Functions.

## Quick start

### 1. Set DSN environment variables

| Platform | Variable |
|----------|----------|
| Web (Vite) | `VITE_SENTRY_DSN` |
| Mobile (Expo) | `EXPO_PUBLIC_SENTRY_DSN` |

Add these to your `.env.local` (web) or `.env` (mobile). Leave them empty in local dev to disable Sentry silently — the package is a no-op when no DSN is provided.

### 2. Web — already wired

`apps/web/src/main.tsx` calls `initObservability(beakerstackObservabilityConfig)` on startup. The config is in `apps/web/src/config/observability.ts`.

To enable the React error boundary and routing instrumentation, wrap your router:

```tsx
// apps/web/src/App.tsx
import { ObservabilityProvider } from '@beakerstack/observability/web';
import { beakerstackObservabilityConfig } from './config/observability';

export function App() {
  return (
    <ObservabilityProvider config={beakerstackObservabilityConfig}>
      {/* existing providers / router */}
    </ObservabilityProvider>
  );
}
```

### 3. Mobile — wire navigation

```tsx
// apps/mobile/App.tsx
import { ObservabilityProvider } from '@beakerstack/observability/native';
import { beakerstackObservabilityConfig } from './src/config/observability';
import { navigationRef } from './src/navigation/navigationRef';

export default function App() {
  return (
    <ObservabilityProvider config={beakerstackObservabilityConfig} navigationRef={navigationRef}>
      {/* AuthProvider / BillingProvider / Navigator */}
    </ObservabilityProvider>
  );
}
```

### 4. Edge Functions

```ts
import { initEdgeObservability, withEdgeScope, captureEdgeException } from '../_shared/observability.ts';

initEdgeObservability({ project: 'my-fn', environment: Deno.env.get('ENVIRONMENT') ?? 'development' });

Deno.serve(withEdgeScope(async (req) => {
  // ... handler
  return new Response('ok');
}));
```

> **Note:** The Sentry Node/browser SDKs are not compatible with the Deno runtime. `withEdgeScope` is currently a pass-through wrapper. A Deno-compatible Sentry SDK can be substituted in `supabase/functions/_shared/observability.ts` without touching call-sites.

## Configuration reference

```ts
interface ObservabilityConfig {
  project: string;          // logical project name (e.g. "beakerstack", "beakerstack-mobile")
  environment: string;      // "development" | "staging" | "production"
  dsn?: string;             // Sentry DSN — omit to disable
  release?: string;         // semver or commit SHA for source map linking
  sampling?: {
    traces?: number;        // default 0.1 (10 %)
    replayOnError?: number;  // default 1.0 (100 %) — fraction of error sessions captured as replay
    replay?: number;        // default 0.0 (disabled)
  };
  pii?: {
    captureIp?: boolean;    // default false — strips IP from Sentry events
  };
}
```

## Sampling and spend control

The defaults are conservative:

| Signal | Default | Env to watch |
|--------|---------|--------------|
| Traces | 10 % | Raise carefully — transactions are expensive |
| Errors | 100 % | Lower only if error volume is extremely high |
| Session replay | 0 % | Enable explicitly; billed per session |

Override per-environment by adjusting `apps/web/src/config/observability.ts` or `apps/mobile/src/config/observability.ts`.

## PII scrubbing

The package scrubs PII before sending to Sentry:

- **User IDs** — hashed with SHA-256 before being set on the Sentry scope via `setUser`. Raw user IDs are never sent.
- **Email addresses** — scrubbed from breadcrumb messages (replaced with `[email]`).
- **IP addresses** — stripped from Sentry events unless `pii.captureIp: true`.

The scrubbing utilities are exported from the package root for use in other contexts:

```ts
import { hashUserId, scrubEmail } from '@beakerstack/observability';
```

## Crash symbolication (source maps)

To get human-readable stack traces in Sentry you need to upload source maps as part of CI. Add a step after your build:

```yaml
# .github/workflows/deploy.yml
- name: Upload source maps to Sentry
  run: npx @sentry/cli releases files "$RELEASE" upload-sourcemaps ./dist
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: beakerstack
    RELEASE: ${{ github.sha }}
```

Pass the same value as `config.release` in your `ObservabilityConfig`.

## Using the hook

Within any component wrapped by `ObservabilityProvider`:

```tsx
import { useObservability } from '@beakerstack/observability/web';

function MyComponent() {
  const obs = useObservability();

  // After login
  obs.setUser('user-uuid-123');  // hashed automatically

  // Manual breadcrumb
  obs.addBreadcrumb({ message: 'User opened checkout', category: 'ui' });

  // Manual error capture
  try { ... } catch (err) {
    obs.captureException(err);
  }
}
```

## Disabling in tests

Tests that don't mock `@sentry/react` will hit no-op stubs because the package only initialises Sentry when a DSN is present. Tests in `packages/observability` mock `@sentry/react` directly — see the [TDZ-safe mock pattern](../packages/observability/src/__tests__/init.web.test.ts) for the correct approach.

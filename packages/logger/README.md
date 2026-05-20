# @beakerstack/logger

Shared logging facade for BeakerStack packages and apps.

## Usage

Import `Logger` directly — do not depend on `@beakerstack/shared` for logging:

```ts
import { Logger } from '@beakerstack/logger';

Logger.debug('[my-package] detail only in dev');
Logger.info('[my-package] something happened');
Logger.warn('[my-package] unexpected state');
Logger.error('[my-package] operation failed', err);
```

Prefix messages with `[package-name]` so logs are easy to scan across the monorepo.

## Rules

- **`@beakerstack/logger` is the only package allowed to call `console.*`** (enforced by ESLint).
- Packages that need logging add `"@beakerstack/logger": "1.0.0"` as a dependency.
- Do not re-export `Logger` from `@beakerstack/shared` or other packages.

## Observability

Apps wire production telemetry once at startup via `Logger.setTelemetryHandler()` (see `apps/web/src/setupLogging.ts`). When `@beakerstack/observability` is integrated, pass the Sentry handle to `setupLogging(telemetry)` so `Logger.warn` / `Logger.error` reach Sentry automatically.

## API

| Method                                   | Behavior                         |
| ---------------------------------------- | -------------------------------- |
| `Logger.debug(...args)`                  | Dev only → `console.debug`       |
| `Logger.info(...args)`                   | → `console.info`                 |
| `Logger.warn(...args)`                   | → `console.warn`                 |
| `Logger.error(...args)`                  | → `console.error`                |
| `Logger.setTelemetryHandler(fn \| null)` | Optional bridge to observability |

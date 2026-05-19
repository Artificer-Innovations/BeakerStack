import type { ObservabilityConfig } from './types.js';
import { validateConfig } from './schema.js';
import { TRACE_SAMPLE_RATE, ERROR_SAMPLE_RATE, REPLAY_SAMPLE_RATE } from './defaults.js';

// Load Sentry at module initialization — dynamic import is intercepted by vi.mock in tests.
// If @sentry/react is not installed, Sentry stays null and all calls become no-ops.
const Sentry = await import('@sentry/react').catch(() => null) as typeof import('@sentry/react') | null;

let _initialized = false;

export function initObservability(config: ObservabilityConfig): void {
  if (!Sentry) return;

  if (_initialized || Sentry.getClient() != null) {
    _initialized = true;
    return;
  }

  validateConfig(config);
  _initialized = true;

  Sentry.init({
    ...(config.dsn != null && { dsn: config.dsn }),
    environment: config.environment,
    ...(config.release != null && { release: config.release }),
    tracesSampleRate: config.sampling?.traces ?? TRACE_SAMPLE_RATE,
    replaysSessionSampleRate: config.sampling?.replay ?? REPLAY_SAMPLE_RATE,
    replaysOnErrorSampleRate: config.sampling?.errors ?? ERROR_SAMPLE_RATE,
    beforeSend(event) {
      if (!config.pii?.captureIp && event.user) {
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export function resetForTesting(): void {
  _initialized = false;
}

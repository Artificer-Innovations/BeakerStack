import type { ObservabilityConfig } from './types.js';
import { validateConfig } from './schema.js';
import { TRACE_SAMPLE_RATE, ERROR_SAMPLE_RATE, REPLAY_SAMPLE_RATE } from './defaults.js';

// Lazy module reference — avoids top-level await, which is incompatible with
// ES2020 / Chrome 87 / Firefox 78 build targets.
let _Sentry: typeof import('@sentry/react') | null | undefined;
let _initialized = false;

async function getSentry(): Promise<typeof import('@sentry/react') | null> {
  if (_Sentry !== undefined) return _Sentry;
  _Sentry = await import('@sentry/react').catch(() => null);
  return _Sentry;
}

export async function initObservability(config: ObservabilityConfig): Promise<void> {
  const Sentry = await getSentry();
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
    replaysOnErrorSampleRate: config.sampling?.replayOnError ?? ERROR_SAMPLE_RATE,
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
  _Sentry = undefined;
}

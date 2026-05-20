import type { ObservabilityConfig } from './types.js';
import { normalizeObservabilityConfig, validateConfig } from './schema.js';
import {
  TRACE_SAMPLE_RATE,
  ERROR_SAMPLE_RATE,
  REPLAY_SAMPLE_RATE,
} from './defaults.js';

// Lazy module reference — avoids top-level await, which is incompatible with
// ES2020 / Chrome 87 / Firefox 78 build targets.
let _Sentry: typeof import('@sentry/react') | null | undefined;
let _initialized = false;

async function getSentry(): Promise<typeof import('@sentry/react') | null> {
  if (_Sentry !== undefined) return _Sentry;
  _Sentry = await import('@sentry/react').catch(() => null);
  return _Sentry;
}

function logInitFailure(err: unknown): void {
  if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'test') {
    return;
  }
  // eslint-disable-next-line no-console -- init must not throw; surface failures for local debugging
  console.warn('[observability] init failed:', err);
}

export async function initObservability(
  config: ObservabilityConfig
): Promise<void> {
  try {
    const Sentry = await getSentry();
    if (!Sentry) return;

    if (_initialized || Sentry.getClient() != null) {
      _initialized = true;
      return;
    }

    const normalized = normalizeObservabilityConfig(config);
    validateConfig(normalized);

    if (!normalized.dsn) {
      return;
    }

    Sentry.init({
      dsn: normalized.dsn,
      environment: normalized.environment,
      ...(normalized.release != null && { release: normalized.release }),
      tracesSampleRate: normalized.sampling?.traces ?? TRACE_SAMPLE_RATE,
      replaysSessionSampleRate:
        normalized.sampling?.replay ?? REPLAY_SAMPLE_RATE,
      replaysOnErrorSampleRate:
        normalized.sampling?.replayOnError ?? ERROR_SAMPLE_RATE,
      beforeSend(event) {
        if (!normalized.pii?.captureIp && event.user) {
          delete event.user.ip_address;
        }
        return event;
      },
    });
    _initialized = true;
  } catch (err) {
    logInitFailure(err);
  }
}

export function resetForTesting(): void {
  _initialized = false;
  _Sentry = undefined;
}

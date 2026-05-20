/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ObservabilityConfig } from './types.js';
import { normalizeObservabilityConfig, validateConfig } from './schema.js';
import { TRACE_SAMPLE_RATE } from './defaults.js';
import {
  getOrCreateReactNavigationIntegration,
  resetNavigationIntegrationForTesting,
} from './reactNavigationIntegration.native.js';

// Lazy module reference — avoids top-level await, which is incompatible with
// ES2020 / Chrome 87 / Firefox 78 build targets.
let _Sentry: any;
let _initialized = false;

async function getSentry(): Promise<any> {
  if (_Sentry !== undefined) return _Sentry;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: optional peer dep — not installed in type-check environments
  _Sentry = await import('@sentry/react-native').catch(() => null);
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

    const navigationIntegration = getOrCreateReactNavigationIntegration(Sentry);

    Sentry.init({
      dsn: normalized.dsn,
      environment: normalized.environment,
      ...(normalized.release != null && { release: normalized.release }),
      tracesSampleRate: normalized.sampling?.traces ?? TRACE_SAMPLE_RATE,
      enableAutoSessionTracking: true,
      attachScreenshot: false,
      enableNativeNagger: false,
      integrations: [
        Sentry.reactNativeTracingIntegration(),
        navigationIntegration,
      ],
    } as Parameters<typeof Sentry.init>[0]);
    _initialized = true;
  } catch (err) {
    logInitFailure(err);
  }
}

export function resetForTesting(): void {
  _initialized = false;
  _Sentry = undefined;
  resetNavigationIntegrationForTesting();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ObservabilityConfig } from './types.js';
import { validateConfig } from './schema.js';
import { TRACE_SAMPLE_RATE } from './defaults.js';

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
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.sampling?.traces ?? TRACE_SAMPLE_RATE,
    enableAutoSessionTracking: true,
    attachScreenshot: false,
    enableNativeNagger: false,
  } as Parameters<typeof Sentry.init>[0]);
}

export function resetForTesting(): void {
  _initialized = false;
  _Sentry = undefined;
}

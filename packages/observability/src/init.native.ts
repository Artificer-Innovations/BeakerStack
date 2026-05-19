/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ObservabilityConfig } from './types.js';
import { validateConfig } from './schema.js';
import { TRACE_SAMPLE_RATE } from './defaults.js';

// Load Sentry at module initialization — dynamic import is intercepted by vi.mock in tests.
// If @sentry/react-native is not installed, Sentry stays null and all calls become no-ops.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: optional peer dep — not installed in type-check environments
const Sentry = await import('@sentry/react-native').catch(() => null) as any;

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
}

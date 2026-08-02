/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from '@beakerstack/logger';
// Static import: Metro async `import()` from packages/* (watchFolders) throws
// "undefined is not a function" because asyncRequire is not wired for that
// context. Mobile always installs this peer dependency.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: optional peer dep — not installed in some type-check environments
import * as Sentry from '@sentry/react-native';
import type { ObservabilityConfig } from './types.js';
import { normalizeObservabilityConfig, validateConfig } from './schema.js';
import { TRACE_SAMPLE_RATE } from './defaults.js';
import {
  getOrCreateReactNavigationIntegration,
  resetNavigationIntegrationForTesting,
} from './reactNavigationIntegration.native.js';

let _initialized = false;

function logInitFailure(err: unknown): void {
  if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'test') {
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  Logger.warn('[observability] init failed:', message, stack);
}

export async function initObservability(
  config: ObservabilityConfig
): Promise<void> {
  try {
    const existingClient =
      typeof Sentry.getClient === 'function' ? Sentry.getClient() : null;
    if (_initialized || existingClient != null) {
      _initialized = true;
      return;
    }

    const normalized = normalizeObservabilityConfig(config);
    validateConfig(normalized);

    if (!normalized.dsn) {
      return;
    }

    const integrations: unknown[] = [];
    if (typeof Sentry.reactNativeTracingIntegration === 'function') {
      integrations.push(Sentry.reactNativeTracingIntegration());
    }
    if (typeof Sentry.reactNavigationIntegration === 'function') {
      integrations.push(getOrCreateReactNavigationIntegration(Sentry));
    }

    Sentry.init({
      dsn: normalized.dsn,
      environment: normalized.environment,
      ...(normalized.release != null && { release: normalized.release }),
      tracesSampleRate: normalized.sampling?.traces ?? TRACE_SAMPLE_RATE,
      enableAutoSessionTracking: true,
      attachScreenshot: false,
      enableNativeNagger: false,
      ...(integrations.length > 0 ? { integrations } : {}),
    } as Parameters<typeof Sentry.init>[0]);
    _initialized = true;
  } catch (err) {
    logInitFailure(err);
  }
}

export function resetForTesting(): void {
  _initialized = false;
  resetNavigationIntegrationForTesting();
}

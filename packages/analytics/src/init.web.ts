import { init as plausibleInit } from '@plausible-analytics/tracker';
import {
  buildPlausibleInitConfig,
  isAnalyticsEnabled,
  normalizeAnalyticsConfig,
  validateAnalyticsConfig,
} from './schema.js';
import type { AnalyticsConfig } from './types.js';

let initialized = false;

/** Test-only reset; the upstream tracker cannot be re-initialized after init. */
export function resetAnalyticsInitStateForTests(): void {
  initialized = false;
}

export function isAnalyticsInitialized(): boolean {
  return initialized;
}

export function initAnalytics(config: AnalyticsConfig): void {
  if (initialized || !isAnalyticsEnabled(config)) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  const normalized = normalizeAnalyticsConfig(config);
  validateAnalyticsConfig(normalized);
  plausibleInit(buildPlausibleInitConfig(normalized));
  initialized = true;
}

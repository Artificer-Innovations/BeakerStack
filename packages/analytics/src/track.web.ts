import { track as plausibleTrack } from '@plausible-analytics/tracker';
import {
  isAnalyticsEnabled,
  isPathExcluded,
  normalizeAnalyticsConfig,
  pathnameFromEventUrl,
  resolvePageviewUrl,
} from './schema.js';
import type { AnalyticsConfig } from './types.js';

export function trackPageview(
  config: AnalyticsConfig,
  pathOverride?: string
): void {
  if (!isAnalyticsEnabled(config)) {
    return;
  }

  const normalized = normalizeAnalyticsConfig(config);
  const url = resolvePageviewUrl(pathOverride);

  if (isPathExcluded(pathnameFromEventUrl(url), normalized.excludePaths)) {
    return;
  }

  plausibleTrack('pageview', { url });
}

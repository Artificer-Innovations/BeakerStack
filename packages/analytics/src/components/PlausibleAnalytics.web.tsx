import { useEffect } from 'react';
import { initAnalytics } from '../init.web.js';
import type { AnalyticsConfig } from '../types.js';

export interface PlausibleAnalyticsProps {
  config: AnalyticsConfig;
}

/**
 * Initializes Plausible v2 via `@plausible-analytics/tracker`.
 * SPA pageviews are captured automatically (history API hooks).
 */
export function PlausibleAnalytics({ config }: PlausibleAnalyticsProps) {
  const { domain, endpoint, captureOnLocalhost, excludePaths } = config;
  const excludePathsKey = excludePaths?.join('\0') ?? '';

  useEffect(() => {
    initAnalytics(config);
  }, [domain, endpoint, captureOnLocalhost, excludePathsKey]);

  return null;
}

/** @deprecated Use `PlausibleAnalytics` — kept for existing imports. */
export const PlausiblePageView = PlausibleAnalytics;

export type PlausiblePageViewProps = PlausibleAnalyticsProps;

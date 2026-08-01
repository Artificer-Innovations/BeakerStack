import { track as plausibleTrack } from '@plausible-analytics/tracker';
import {
  isAnalyticsEnabled,
  isPathExcluded,
  normalizeAnalyticsConfig,
} from './schema.js';
import type { AnalyticsConfig } from './types.js';

export type TrackEventProps = Record<string, string | number | boolean>;

function normalizeEventProps(
  props?: TrackEventProps
): Record<string, string> | undefined {
  if (!props) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, String(value)])
  );
}

export function trackEvent(
  config: AnalyticsConfig,
  name: string,
  props?: TrackEventProps
): void {
  if (!isAnalyticsEnabled(config)) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  const normalized = normalizeAnalyticsConfig(config);
  const pathname = window.location.pathname;

  if (isPathExcluded(pathname, normalized.excludePaths)) {
    return;
  }

  const eventProps = normalizeEventProps(props);
  plausibleTrack(name, eventProps ? { props: eventProps } : {});
}

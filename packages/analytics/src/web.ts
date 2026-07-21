export type { AnalyticsConfig } from './types.js';
export {
  normalizeAnalyticsConfig,
  validateAnalyticsConfig,
  isAnalyticsEnabled,
  isPathExcluded,
  pathnameFromEventUrl,
  filterExcludedPageviews,
  buildPlausibleInitConfig,
  resolvePageviewUrl,
} from './schema.js';
export { DEFAULT_EXCLUDE_PATHS, DEFAULT_ENDPOINT } from './defaults.js';
export { initAnalytics } from './init.web.js';
export { trackPageview } from './track.web.js';
export { trackEvent } from './trackEvent.web.js';
export type { TrackEventProps } from './trackEvent.web.js';
export {
  PlausibleAnalytics,
  PlausiblePageView,
} from './components/PlausibleAnalytics.web.js';
export type {
  PlausibleAnalyticsProps,
  PlausiblePageViewProps,
} from './components/PlausibleAnalytics.web.js';

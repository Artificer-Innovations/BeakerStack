export interface AnalyticsConfig {
  /** Plausible site domain (must match the site registered in Plausible). */
  domain?: string;
  /** Plausible event API endpoint. Defaults to SaaS `https://plausible.io/api/event`. */
  endpoint?: string;
  /** Path prefixes excluded from pageview tracking. */
  excludePaths?: string[];
  /** When true, send events on localhost (default false). */
  captureOnLocalhost?: boolean;
}

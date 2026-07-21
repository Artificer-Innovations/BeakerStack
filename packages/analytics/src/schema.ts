import type {
  PlausibleConfig,
  PlausibleRequestPayload,
} from '@plausible-analytics/tracker';
import { z } from 'zod';
import { DEFAULT_EXCLUDE_PATHS } from './defaults.js';
import type { AnalyticsConfig } from './types.js';

export type NormalizedAnalyticsConfig = Omit<
  AnalyticsConfig,
  'excludePaths'
> & {
  excludePaths: string[];
};

export const analyticsConfigSchema = z.object({
  domain: z.string().min(1).optional(),
  endpoint: z.string().url().optional(),
  excludePaths: z.array(z.string().min(1)).optional(),
  captureOnLocalhost: z.boolean().optional(),
});

export function normalizeAnalyticsConfig(
  config: AnalyticsConfig
): NormalizedAnalyticsConfig {
  const domain = config.domain?.trim();
  const endpoint = config.endpoint?.trim();

  return {
    excludePaths: config.excludePaths ?? [...DEFAULT_EXCLUDE_PATHS],
    ...(domain ? { domain } : {}),
    ...(endpoint ? { endpoint } : {}),
    ...(config.captureOnLocalhost === true ? { captureOnLocalhost: true } : {}),
  };
}

export function validateAnalyticsConfig(config: AnalyticsConfig): void {
  analyticsConfigSchema.parse(normalizeAnalyticsConfig(config));
}

export function isAnalyticsEnabled(config: AnalyticsConfig): boolean {
  return Boolean(config.domain?.trim());
}

export function isPathExcluded(
  pathname: string,
  excludePaths: readonly string[]
): boolean {
  return excludePaths.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function pathnameFromEventUrl(eventUrl: string): string {
  try {
    return new URL(eventUrl).pathname;
  } catch {
    const [path = ''] = eventUrl.split('?', 1);
    return path.startsWith('/') ? path : `/${path}`;
  }
}

export function filterExcludedPageviews(
  payload: PlausibleRequestPayload,
  excludePaths: readonly string[]
): PlausibleRequestPayload | null {
  if (payload.n !== 'pageview') {
    return payload;
  }

  if (isPathExcluded(pathnameFromEventUrl(payload.u), excludePaths)) {
    return null;
  }

  return payload;
}

export function buildPlausibleInitConfig(
  normalized: NormalizedAnalyticsConfig
): PlausibleConfig {
  const domain = normalized.domain;
  if (!domain) {
    throw new Error('buildPlausibleInitConfig requires domain');
  }

  return {
    domain,
    ...(normalized.endpoint ? { endpoint: normalized.endpoint } : {}),
    autoCapturePageviews: true,
    logging: false,
    ...(normalized.captureOnLocalhost ? { captureOnLocalhost: true } : {}),
    transformRequest: payload =>
      filterExcludedPageviews(payload, normalized.excludePaths),
  };
}

export function resolvePageviewUrl(pathOverride?: string): string {
  if (pathOverride != null && pathOverride !== '') {
    if (/^https?:\/\//i.test(pathOverride)) {
      return pathOverride;
    }
    const path = pathOverride.startsWith('/')
      ? pathOverride
      : `/${pathOverride}`;
    return `${window.location.origin}${path}`;
  }
  return window.location.href;
}

import { describe, it, expect } from 'vitest';
import {
  analyticsConfigSchema,
  buildPlausibleInitConfig,
  filterExcludedPageviews,
  isAnalyticsEnabled,
  isPathExcluded,
  normalizeAnalyticsConfig,
  pathnameFromEventUrl,
  resolvePageviewUrl,
  validateAnalyticsConfig,
} from '../schema.js';
import { DEFAULT_ENDPOINT, DEFAULT_EXCLUDE_PATHS } from '../defaults.js';

describe('analytics schema', () => {
  it('DEFAULT_EXCLUDE_PATHS includes /admin', () => {
    expect(DEFAULT_EXCLUDE_PATHS).toEqual(['/admin']);
  });

  it('DEFAULT_ENDPOINT points at Plausible SaaS API', () => {
    expect(DEFAULT_ENDPOINT).toBe('https://plausible.io/api/event');
  });

  it('normalizes domain and endpoint', () => {
    expect(
      normalizeAnalyticsConfig({
        domain: ' getskein.ai ',
        endpoint: ' https://plausible.io/api/event ',
      })
    ).toEqual({
      domain: 'getskein.ai',
      endpoint: 'https://plausible.io/api/event',
      excludePaths: ['/admin'],
    });
  });

  it('defaults excludePaths when omitted', () => {
    expect(normalizeAnalyticsConfig({ domain: 'getskein.ai' })).toEqual({
      domain: 'getskein.ai',
      excludePaths: ['/admin'],
    });
  });

  it('validateAnalyticsConfig rejects invalid endpoint', () => {
    expect(() => validateAnalyticsConfig({ endpoint: 'not-a-url' })).toThrow();
  });

  it('isAnalyticsEnabled is false without domain', () => {
    expect(isAnalyticsEnabled({})).toBe(false);
    expect(isAnalyticsEnabled({ domain: '  ' })).toBe(false);
    expect(isAnalyticsEnabled({ domain: 'getskein.ai' })).toBe(true);
  });

  it('isPathExcluded matches prefix paths', () => {
    expect(isPathExcluded('/admin', ['/admin'])).toBe(true);
    expect(isPathExcluded('/admin/waitlist', ['/admin'])).toBe(true);
    expect(isPathExcluded('/dashboard', ['/admin'])).toBe(false);
  });

  it('pathnameFromEventUrl parses absolute and relative URLs', () => {
    expect(pathnameFromEventUrl('https://getskein.ai/pr-1/home?x=1')).toBe(
      '/pr-1/home'
    );
    expect(pathnameFromEventUrl('/dashboard')).toBe('/dashboard');
    expect(pathnameFromEventUrl('dashboard')).toBe('/dashboard');
  });

  it('filterExcludedPageviews drops admin pageviews', () => {
    expect(
      filterExcludedPageviews(
        { n: 'pageview', u: 'https://getskein.ai/admin', d: 'getskein.ai' },
        ['/admin']
      )
    ).toBeNull();
  });

  it('filterExcludedPageviews passes non-pageview events', () => {
    const payload = {
      n: 'signup',
      u: 'https://getskein.ai/admin',
      d: 'getskein.ai',
    };
    expect(filterExcludedPageviews(payload, ['/admin'])).toBe(payload);
  });

  it('buildPlausibleInitConfig wires transformRequest', () => {
    const config = buildPlausibleInitConfig(
      normalizeAnalyticsConfig({ domain: 'getskein.ai' })
    );
    expect(config.domain).toBe('getskein.ai');
    expect(config.autoCapturePageviews).toBe(true);
    expect(config.transformRequest).toEqual(expect.any(Function));
    expect(
      config.transformRequest?.({
        n: 'pageview',
        u: 'https://getskein.ai/admin',
        d: 'getskein.ai',
      })
    ).toBeNull();
  });

  it('buildPlausibleInitConfig requires domain', () => {
    expect(() =>
      buildPlausibleInitConfig(normalizeAnalyticsConfig({}))
    ).toThrow('requires domain');
  });

  it('filterExcludedPageviews passes allowed pageviews', () => {
    const payload = {
      n: 'pageview',
      u: 'https://getskein.ai/home',
      d: 'getskein.ai',
    };
    expect(filterExcludedPageviews(payload, ['/admin'])).toBe(payload);
  });

  it('resolvePageviewUrl prefixes bare path segments', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://getskein.ai', href: 'https://getskein.ai/x' },
    });
    expect(resolvePageviewUrl()).toBe('https://getskein.ai/x');
    expect(resolvePageviewUrl('dashboard')).toBe(
      'https://getskein.ai/dashboard'
    );
  });

  it('analyticsConfigSchema accepts captureOnLocalhost', () => {
    expect(
      analyticsConfigSchema.parse({
        domain: 'getskein.ai',
        captureOnLocalhost: true,
      })
    ).toEqual({
      domain: 'getskein.ai',
      captureOnLocalhost: true,
    });
  });
});

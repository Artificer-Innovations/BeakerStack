import { describe, it, expect } from 'vitest';

describe('root barrel exports', () => {
  it('loads the type-only entry', async () => {
    const mod = await import('../index.js');
    expect(mod).toBeDefined();
  });
});

describe('web barrel exports', () => {
  it('exports expected symbols', async () => {
    const mod = await import('../web.js');
    expect(typeof mod.normalizeAnalyticsConfig).toBe('function');
    expect(typeof mod.validateAnalyticsConfig).toBe('function');
    expect(typeof mod.isAnalyticsEnabled).toBe('function');
    expect(typeof mod.isPathExcluded).toBe('function');
    expect(typeof mod.buildPlausibleInitConfig).toBe('function');
    expect(typeof mod.initAnalytics).toBe('function');
    expect(typeof mod.trackPageview).toBe('function');
    expect(typeof mod.trackEvent).toBe('function');
    expect(typeof mod.PlausibleAnalytics).toBe('function');
    expect(typeof mod.PlausiblePageView).toBe('function');
    expect(mod.DEFAULT_EXCLUDE_PATHS).toEqual(['/admin']);
    expect(mod.DEFAULT_ENDPOINT).toBe('https://plausible.io/api/event');
  });
});

describe('types module', () => {
  it('exports AnalyticsConfig shape', async () => {
    const mod = await import('../types.js');
    expect(mod).toBeDefined();
  });
});

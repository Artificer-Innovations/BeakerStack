import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('analyticsConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is empty when Plausible env vars are unset', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', '');
    vi.stubEnv('VITE_PLAUSIBLE_ENDPOINT', '');
    vi.stubEnv('VITE_PLAUSIBLE_CAPTURE_ON_LOCALHOST', '');

    const { analyticsConfig } = await import('../analytics');

    expect(analyticsConfig).toEqual({});
  });

  it('reads trimmed domain and endpoint from env', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', ' getskein.ai ');
    vi.stubEnv('VITE_PLAUSIBLE_ENDPOINT', ' https://plausible.io/api/event ');

    const { analyticsConfig } = await import('../analytics');

    expect(analyticsConfig).toEqual({
      domain: 'getskein.ai',
      endpoint: 'https://plausible.io/api/event',
    });
  });

  it('enables captureOnLocalhost from env flag', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', 'getskein.ai');
    vi.stubEnv('VITE_PLAUSIBLE_CAPTURE_ON_LOCALHOST', 'true');

    const { analyticsConfig } = await import('../analytics');

    expect(analyticsConfig).toEqual({
      domain: 'getskein.ai',
      captureOnLocalhost: true,
    });
  });

  it('ignores blank endpoint when domain is set', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', 'getskein.ai');
    vi.stubEnv('VITE_PLAUSIBLE_ENDPOINT', '   ');

    const { analyticsConfig } = await import('../analytics');

    expect(analyticsConfig).toEqual({
      domain: 'getskein.ai',
    });
  });
});

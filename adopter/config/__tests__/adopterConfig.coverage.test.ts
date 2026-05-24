import { afterEach, describe, expect, it, vi } from 'vitest';

describe('waitlistConfig (browser origins)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses window.location.origin when BASE_URL is an absolute URL', async () => {
    vi.stubEnv('BASE_URL', 'https://cdn.example.com/app/');
    vi.stubGlobal('window', {
      location: { origin: 'https://app.example.com' },
    });
    const { waitlistConfig } = await import('@adopter/config/waitlist');
    expect(waitlistConfig.appOrigin).toBe('https://app.example.com');
  });

  it('joins origin and relative BASE_URL without a trailing slash', async () => {
    vi.stubEnv('BASE_URL', '/my-app/');
    vi.stubGlobal('window', {
      location: { origin: 'https://app.example.com' },
    });
    const { waitlistConfig } = await import('@adopter/config/waitlist');
    expect(waitlistConfig.appOrigin).toBe('https://app.example.com/my-app');
  });

  it('defaults BASE_URL to slash when the env var is unset', async () => {
    vi.unstubAllEnvs();
    vi.stubGlobal('window', {
      location: { origin: 'https://app.example.com' },
    });
    const { waitlistConfig } = await import('@adopter/config/waitlist');
    expect(waitlistConfig.appOrigin).toBe('https://app.example.com');
  });
});

describe('landingConfig (publicUrl)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('builds hero asset URLs from BASE_URL', async () => {
    vi.stubEnv('BASE_URL', '/my-app/');
    const { landingConfig } = await import('@adopter/config/landing');
    expect(landingConfig.hero.mediaSrc).toBe('/my-app/landing/hero.avif');
  });

  it('defaults public asset URLs to the site root when BASE_URL is unset', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { landingConfig } = await import('@adopter/config/landing');
    expect(landingConfig.hero.mediaSrc).toBe('/landing/hero.avif');
  });
});

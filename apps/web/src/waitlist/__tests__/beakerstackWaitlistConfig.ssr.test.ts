import { afterEach, describe, expect, it, vi } from 'vitest';

describe('waitlistConfig (SSR)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses localhost origin when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    const { waitlistConfig } = await import('@adopter/config/waitlist');
    expect(waitlistConfig.appOrigin).toBe('http://localhost:5173');
  });
});

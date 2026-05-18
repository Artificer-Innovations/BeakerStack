import { afterEach, describe, expect, it, vi } from 'vitest';

describe('beakerstackWaitlistConfig (SSR)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses localhost origin when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    const { beakerstackWaitlistConfig } =
      await import('../beakerstackWaitlistConfig.js');
    expect(beakerstackWaitlistConfig.appOrigin).toBe('http://localhost:5173');
  });
});

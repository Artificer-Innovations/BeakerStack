import { describe, expect, it } from 'vitest';

describe('package barrels', () => {
  it('exports main entry', async () => {
    const mod = await import('./index.js');
    expect(mod.defineWaitlistConfig).toBeTypeOf('function');
    expect(mod.getPublicWaitlistSettings).toBeTypeOf('function');
    expect(mod.useSignupMode).toBeTypeOf('function');
    expect(mod.emitLifecycleEvent).toBeTypeOf('function');
  });

  it('exports web entry', async () => {
    const mod = await import('./web.js');
    expect(mod.WaitlistForm).toBeTypeOf('function');
    expect(mod.SignupModeGate).toBeTypeOf('function');
  });
});

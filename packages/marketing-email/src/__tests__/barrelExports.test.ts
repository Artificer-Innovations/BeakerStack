import { describe, expect, it } from 'vitest';

describe('package barrels', () => {
  it('exports main entry', async () => {
    const mod = await import('../index.js');
    expect(mod.defineMarketingEmailConfig).toBeTypeOf('function');
    expect(mod.KitAdapter).toBeTypeOf('function');
    expect(mod.defineKitConfig).toBeTypeOf('function');
    expect(mod.MarketingEmailError).toBeTypeOf('function');
    expect(mod.waitlistTag).toBeTypeOf('function');
  });

  it('exports web entry', async () => {
    const mod = await import('../web.js');
    expect(mod.KitAdapter).toBeTypeOf('function');
    expect(mod.defineMarketingEmailConfig).toBeTypeOf('function');
  });

  it('exports native entry', async () => {
    const mod = await import('../native.js');
    expect(mod.KitAdapter).toBeTypeOf('function');
    expect(mod.defineMarketingEmailConfig).toBeTypeOf('function');
  });
});

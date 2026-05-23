import { describe, expect, it } from 'vitest';

describe('package barrels', () => {
  it('exports main entry', async () => {
    const mod = await import('../index.js');
    expect(mod.defineMarketingEmailConfig).toBeTypeOf('function');
    expect(mod.NAMESPACE_RE).toBeInstanceOf(RegExp);
    expect(mod.KitAdapter).toBeTypeOf('function');
    expect(mod.defineKitConfig).toBeTypeOf('function');
    expect(mod.MarketingEmailError).toBeTypeOf('function');
    expect(mod.waitlistTag).toBeTypeOf('function');
    expect(mod.getAdminMarketingEmailSettings).toBeTypeOf('function');
    expect(mod.updateAdminMarketingEmailSettings).toBeTypeOf('function');
    expect(mod.getAdminMarketingEmailQueueStats).toBeTypeOf('function');
    expect(mod.normalizeMarketingEmailAdminSettings).toBeTypeOf('function');
    expect(mod.DEFAULT_MARKETING_EMAIL_ADMIN_SETTINGS).toBeTypeOf('object');
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

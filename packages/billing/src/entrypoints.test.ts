import { describe, expect, it } from 'vitest';

describe('package entrypoints', () => {
  it('exports core API from index', async () => {
    const mod = await import('./index.js');
    expect(mod.defineBillingConfig).toBeTypeOf('function');
    expect(mod.BillingProvider).toBeTypeOf('function');
    expect(mod.usePlan).toBeTypeOf('function');
    expect(mod.getRemainingUsage).toBeTypeOf('function');
    expect(mod.hasExceededLimit).toBeTypeOf('function');
    expect(mod.getPlanById).toBeTypeOf('function');
    expect(mod.canUserAccessFeature).toBeTypeOf('function');
  });

  it('exports web UI barrel', async () => {
    const mod = await import('./web.js');
    expect(mod.FeatureGate).toBeTypeOf('function');
    expect(mod.UsageIndicator).toBeTypeOf('function');
  });

  it('exports native UI barrel', async () => {
    const mod = await import('./native.js');
    expect(mod.FeatureGate).toBeTypeOf('function');
    expect(mod.PricingTable).toBeTypeOf('function');
  });
});

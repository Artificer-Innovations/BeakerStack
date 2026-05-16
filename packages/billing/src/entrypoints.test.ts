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
    expect(mod.CadenceToggle).toBeTypeOf('function');
    expect(mod.PlanFeatureList).toBeTypeOf('function');
  });

  it('exports presentation helpers', async () => {
    const mod = await import('./presentation/index.js');
    expect(mod.formatDate).toBeTypeOf('function');
    expect(mod.computeDowngradeBlockers).toBeTypeOf('function');
    expect(mod.annualListCentsFromSync).toBeTypeOf('function');
  });
});

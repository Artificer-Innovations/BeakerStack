import { describe, expect, it } from 'vitest';

describe('@beakerstack/billing/client', () => {
  it('re-exports provider and web components', async () => {
    const mod = await import('./client.js');
    expect(mod.BillingProvider).toBeTypeOf('function');
    expect(mod.FeatureGate).toBeTypeOf('function');
  });
});

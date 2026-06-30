import { describe, expect, it } from 'vitest';
import { billingConfig } from '../billing';

describe('billing VIP plan parity', () => {
  it('beakerstack_vip matches beakerstack_max features and usage limits', () => {
    const max = billingConfig.plans.find(p => p.id === 'beakerstack_max');
    const vip = billingConfig.plans.find(p => p.id === 'beakerstack_vip');
    expect(max).toBeDefined();
    expect(vip).toBeDefined();
    expect(vip?.isPublic).toBe(false);
    expect(vip?.billingPeriod).toBe('monthly');
    expect(vip?.features).toEqual(max?.features);
    expect(vip?.usageLimits).toEqual(max?.usageLimits);
  });
});

import { describe, expect, it } from 'vitest';
import {
  BEAKERSTACK_METER_AI_SUMMARIZE,
  billingConfig,
} from '@adopter/config/billing';

describe('billingConfig', () => {
  it('defines a parsed product with public plans', () => {
    expect(billingConfig.productId).toBe('beakerstack');
    expect(billingConfig.plans.length).toBeGreaterThanOrEqual(1);
    const ids = billingConfig.plans.map(p => p.id);
    expect(ids).toContain('beakerstack_free');
  });

  it('exposes meter key constant for AI usage', () => {
    expect(BEAKERSTACK_METER_AI_SUMMARIZE).toBe('ai_summarize');
  });
});

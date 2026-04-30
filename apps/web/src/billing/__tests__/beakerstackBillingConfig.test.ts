import { describe, expect, it } from 'vitest';
import {
  BEAKERSTACK_METER_AI_SUMMARIZE,
  beakerstackBillingConfig,
} from '../beakerstackBillingConfig';

describe('beakerstackBillingConfig', () => {
  it('defines a parsed product with public plans', () => {
    expect(beakerstackBillingConfig.productId).toBe('beakerstack');
    expect(beakerstackBillingConfig.plans.length).toBeGreaterThanOrEqual(1);
    const ids = beakerstackBillingConfig.plans.map(p => p.id);
    expect(ids).toContain('beakerstack_free');
  });

  it('exposes meter key constant for AI usage', () => {
    expect(BEAKERSTACK_METER_AI_SUMMARIZE).toBe('ai_summarize');
  });
});

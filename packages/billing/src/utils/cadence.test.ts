import { describe, expect, it } from 'vitest';
import { resolveCadence } from './cadence.js';
import { testPlan, testSubscription } from '../test/billingFixtures.js';

describe('resolveCadence', () => {
  const plan = testPlan();

  it('returns null without plan', () => {
    expect(resolveCadence(null, testSubscription())).toBeNull();
  });

  it('returns null without stripe_price_id on subscription', () => {
    expect(
      resolveCadence(plan, testSubscription({ stripe_price_id: null }))
    ).toBeNull();
  });

  it('returns monthly when price matches monthly', () => {
    expect(
      resolveCadence(
        plan,
        testSubscription({ stripe_price_id: 'price_monthly' })
      )
    ).toBe('monthly');
  });

  it('returns annual when price matches annual', () => {
    expect(
      resolveCadence(
        plan,
        testSubscription({ stripe_price_id: 'price_annual' })
      )
    ).toBe('annual');
  });

  it('returns null when price matches neither', () => {
    expect(
      resolveCadence(plan, testSubscription({ stripe_price_id: 'price_other' }))
    ).toBeNull();
  });
});

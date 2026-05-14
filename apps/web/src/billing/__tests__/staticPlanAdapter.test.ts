import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BillingPlanConfig } from '@beakerstack/billing';

vi.mock('../beakerstackBillingConfig', () => ({
  beakerstackBillingConfig: {
    productId: 'beakerstack',
    plans: [] as BillingPlanConfig[],
  },
}));

import { configPlanToStaticPlan, getStaticPlans } from '../staticPlanAdapter';
import { beakerstackBillingConfig } from '../beakerstackBillingConfig';

const mockedConfig = beakerstackBillingConfig as unknown as {
  productId: string;
  plans: Partial<BillingPlanConfig>[];
};

const fullPlan: BillingPlanConfig = {
  id: 'test_pro',
  displayName: 'Pro',
  description: 'Pro plan',
  priceCents: 1900,
  billingPeriod: 'monthly',
  stripePriceIdMonthly: 'price_monthly_123',
  stripePriceIdAnnual: 'price_annual_123',
  stripeProductId: 'prod_123',
  features: { feature_a: true, limit: 10 },
  usageLimits: { ai_summarize: 500 },
  trialPeriodDays: 5,
  isPublic: true,
  displayOrder: 2,
};

describe('configPlanToStaticPlan', () => {
  it('maps all fields from BillingPlanConfig to Plan', () => {
    const plan = configPlanToStaticPlan(fullPlan, 0);
    expect(plan.id).toBe('test_pro');
    expect(plan.product_id).toBe('beakerstack');
    expect(plan.display_name).toBe('Pro');
    expect(plan.description).toBe('Pro plan');
    expect(plan.price_cents).toBe(1900);
    expect(plan.billing_period).toBe('monthly');
    expect(plan.stripe_price_id_monthly).toBe('price_monthly_123');
    expect(plan.stripe_price_id_annual).toBe('price_annual_123');
    expect(plan.stripe_product_id).toBe('prod_123');
    expect(plan.features).toEqual({ feature_a: true, limit: 10 });
    expect(plan.usage_limits).toEqual({ ai_summarize: 500 });
    expect(plan.trial_period_days).toBe(5);
    expect(plan.is_public).toBe(true);
    expect(plan.display_order).toBe(2);
  });

  it('defaults description to null when absent', () => {
    const config = { ...fullPlan } as Partial<BillingPlanConfig>;
    delete config.description;
    const plan = configPlanToStaticPlan(config as BillingPlanConfig, 0);
    expect(plan.description).toBeNull();
  });

  it('defaults trial_period_days to 0 when absent', () => {
    const config = { ...fullPlan } as Partial<BillingPlanConfig>;
    delete config.trialPeriodDays;
    const plan = configPlanToStaticPlan(config as BillingPlanConfig, 0);
    expect(plan.trial_period_days).toBe(0);
  });

  it('defaults is_public to true when absent', () => {
    const config = { ...fullPlan } as Partial<BillingPlanConfig>;
    delete config.isPublic;
    const plan = configPlanToStaticPlan(config as BillingPlanConfig, 0);
    expect(plan.is_public).toBe(true);
  });

  it('defaults display_order to array index when absent', () => {
    const config = { ...fullPlan } as Partial<BillingPlanConfig>;
    delete config.displayOrder;
    const plan = configPlanToStaticPlan(config as BillingPlanConfig, 3);
    expect(plan.display_order).toBe(3);
  });

  it('maps null Stripe fields to null', () => {
    const plan = configPlanToStaticPlan(
      { ...fullPlan, stripePriceIdMonthly: null, stripePriceIdAnnual: null, stripeProductId: null },
      0
    );
    expect(plan.stripe_price_id_monthly).toBeNull();
    expect(plan.stripe_price_id_annual).toBeNull();
    expect(plan.stripe_product_id).toBeNull();
  });
});

describe('getStaticPlans', () => {
  beforeEach(() => {
    mockedConfig.plans = [];
  });

  it('filters out non-public plans', () => {
    mockedConfig.plans = [
      { ...fullPlan, id: 'public_plan', isPublic: true, displayOrder: 1 },
      { ...fullPlan, id: 'private_plan', isPublic: false, displayOrder: 2 },
    ];
    const plans = getStaticPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0].id).toBe('public_plan');
  });

  it('includes plans with isPublic omitted (defaults to visible)', () => {
    const config = { ...fullPlan } as Partial<BillingPlanConfig>;
    delete config.isPublic;
    mockedConfig.plans = [config];
    const plans = getStaticPlans();
    expect(plans).toHaveLength(1);
  });

  it('sorts plans by displayOrder ascending', () => {
    mockedConfig.plans = [
      { ...fullPlan, id: 'order_3', displayOrder: 3 },
      { ...fullPlan, id: 'order_1', displayOrder: 1 },
      { ...fullPlan, id: 'order_2', displayOrder: 2 },
    ];
    const plans = getStaticPlans();
    expect(plans.map(p => p.id)).toEqual(['order_1', 'order_2', 'order_3']);
  });

  it('uses array index as fallback display_order when absent', () => {
    const baseWithoutOrder = { ...fullPlan } as Partial<BillingPlanConfig>;
    delete baseWithoutOrder.displayOrder;
    mockedConfig.plans = [
      { ...baseWithoutOrder, id: 'a' },
      { ...baseWithoutOrder, id: 'b' },
    ];
    const plans = getStaticPlans();
    expect(plans[0].display_order).toBe(0);
    expect(plans[1].display_order).toBe(1);
  });
});

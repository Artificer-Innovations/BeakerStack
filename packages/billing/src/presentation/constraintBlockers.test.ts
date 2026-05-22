import { describe, expect, it } from 'vitest';
import type { Plan } from '../types.js';
import type { ProductBillingConfig } from '../schema.js';
import { computeDowngradeBlockers } from './constraintBlockers.js';

const plan = (over: Partial<Plan>): Plan => ({
  id: 'id',
  product_id: 'beakerstack',
  display_name: 'Name',
  description: null,
  price_cents: 0,
  billing_period: 'monthly',
  stripe_price_id_monthly: null,
  stripe_price_id_annual: null,
  stripe_product_id: null,
  features: {
    containers_per_account_max: 10,
    feature_b: false,
  },
  usage_limits: { ai_summarize: 100 },
  trial_period_days: 0,
  is_public: true,
  display_order: 1,
  ...over,
});

const billingConfig: ProductBillingConfig = {
  productId: 'beakerstack',
  displayName: 'BeakerStack',
  plans: [
    {
      id: 'free',
      displayName: 'Free',
      priceCents: 0,
      billingPeriod: 'free',
      features: {
        containers_per_account_max: 2,
        feature_b: false,
      },
      usageLimits: { ai_summarize: 30 },
    },
    {
      id: 'max',
      displayName: 'Max',
      priceCents: 4900,
      billingPeriod: 'monthly',
      features: {
        containers_per_account_max: -1,
        feature_b: true,
      },
      usageLimits: { ai_summarize: -1 },
    },
  ],
  downgradeConstraintCopy: {
    collectionsOverCap:
      '{current} vs {cap} on {targetPlan}, delete {deleteCount}',
    booleanFeatureLoss:
      '{featureLabel} only on {exclusivePlanName} to {targetPlanName}',
    meterOverCap: '{used} over {limit} for {targetPlan}',
  },
};

const defaultOptions = (
  o: Partial<Parameters<typeof computeDowngradeBlockers>[2]>
) => ({
  collectionCount: 0,
  maxItemsInAnyCollection: 0,
  aiUsedThisPeriod: 0,
  ...o,
});

describe('computeDowngradeBlockers', () => {
  const allPlans = [
    plan({
      id: 'free',
      display_name: 'Free',
      display_order: 1,
      features: {
        containers_per_account_max: 2,
        items_per_container_max: 3,
        feature_b: false,
      },
      usage_limits: { ai_summarize: 30 },
    }),
    plan({
      id: 'max',
      display_name: 'Max',
      display_order: 3,
      features: {
        containers_per_account_max: -1,
        feature_b: true,
      },
      usage_limits: { ai_summarize: -1 },
    }),
  ];

  it('adds collections over cap message to hard', () => {
    const current = plan({
      id: 'pro',
      display_name: 'Pro',
      display_order: 2,
      features: {
        containers_per_account_max: -1,
        feature_b: false,
      },
      usage_limits: { ai_summarize: 500 },
    });
    const target = allPlans[0];
    const blockers = computeDowngradeBlockers(
      current,
      target,
      defaultOptions({ collectionCount: 5, aiUsedThisPeriod: 10 }),
      [...allPlans, current],
      billingConfig
    );
    expect(blockers.hard).toHaveLength(1);
    expect(blockers.hard[0]).toContain('5');
    expect(blockers.hard[0]).toContain('2');
    expect(blockers.hard[0]).toContain('Free');
    expect(blockers.hard[0]).toContain('3');
    expect(blockers.soft).toHaveLength(0);
  });

  it('adds boolean feature loss to soft when downgrading from feature_b', () => {
    const current = plan({
      id: 'max',
      display_name: 'Max',
      display_order: 3,
      features: {
        containers_per_account_max: -1,
        feature_b: true,
      },
      usage_limits: { ai_summarize: -1 },
    });
    const target = plan({
      id: 'pro',
      display_name: 'Pro',
      display_order: 2,
      features: {
        containers_per_account_max: -1,
        feature_b: false,
      },
      usage_limits: { ai_summarize: 500 },
    });
    const blockers = computeDowngradeBlockers(
      current,
      target,
      defaultOptions({}),
      [current, target],
      billingConfig
    );
    expect(blockers.hard).toHaveLength(0);
    expect(blockers.soft.some(b => b.includes('Max'))).toBe(true);
  });

  it('adds items-per-collection overage to hard', () => {
    const free = allPlans[0];
    const current = allPlans[1];
    const blockers = computeDowngradeBlockers(
      current,
      free,
      defaultOptions({ collectionCount: 2, maxItemsInAnyCollection: 4 }),
      allPlans,
      billingConfig
    );
    expect(
      blockers.hard.some(
        m => m.includes('4') && m.includes('3') && m.includes('Free')
      )
    ).toBe(true);
  });

  it('skips items check when target has unlimited items per collection', () => {
    const target = plan({
      features: {
        containers_per_account_max: 2,
        items_per_container_max: -1,
        feature_b: false,
      },
    });
    const current = plan({
      features: { containers_per_account_max: -1, feature_b: true },
    });
    const blockers = computeDowngradeBlockers(
      current,
      target,
      defaultOptions({ maxItemsInAnyCollection: 99 }),
      [current, target],
      billingConfig
    );
    expect(
      blockers.hard.filter(
        m => m.includes('99') || m.includes('items per collection')
      )
    ).toHaveLength(0);
  });

  it('adds meter over cap for ai_summarize to hard', () => {
    const current = allPlans[1];
    const target = allPlans[0];
    const blockers = computeDowngradeBlockers(
      current,
      target,
      defaultOptions({ aiUsedThisPeriod: 50 }),
      allPlans,
      billingConfig
    );
    expect(blockers.hard.some(b => b.includes('50') && b.includes('30'))).toBe(
      true
    );
  });

  it('returns empty hard and soft when no blockers apply', () => {
    const current = allPlans[0];
    const target = allPlans[0];
    const b = computeDowngradeBlockers(
      current,
      target,
      defaultOptions({}),
      allPlans,
      billingConfig
    );
    expect(b.hard).toEqual([]);
    expect(b.soft).toEqual([]);
  });

  it('skips collection check when target cap is negative', () => {
    const target = plan({
      features: { containers_per_account_max: -1, feature_b: false },
    });
    const current = plan({
      features: { containers_per_account_max: -1, feature_b: false },
    });
    const b = computeDowngradeBlockers(
      current,
      target,
      defaultOptions({ collectionCount: 99 }),
      [current, target],
      billingConfig
    );
    expect(b.hard).toEqual([]);
    expect(b.soft).toEqual([]);
  });

  it('adds feature_a to soft when pro downgrades to free (boolean loop)', () => {
    const proP = plan({
      id: 'beakerstack_pro',
      display_name: 'Pro',
      display_order: 2,
      features: {
        feature_a: true,
        feature_b: false,
        containers_per_account_max: -1,
        items_per_container_max: 25,
      },
      usage_limits: { ai_summarize: 500 },
    });
    const freeP = plan({
      id: 'beakerstack_free',
      display_name: 'Free',
      display_order: 1,
      features: {
        feature_a: false,
        feature_b: false,
        containers_per_account_max: 2,
        items_per_container_max: 3,
      },
      usage_limits: { ai_summarize: 30 },
    });
    const blockers = computeDowngradeBlockers(
      proP,
      freeP,
      defaultOptions({ collectionCount: 0, maxItemsInAnyCollection: 0 }),
      [freeP, proP],
      billingConfig
    );
    expect(
      blockers.soft.some(
        m => m.includes('Feature A') && m.includes('Pro') && m.includes('Free')
      )
    ).toBe(true);
  });

  it('uses target plan id when display name is missing', () => {
    const current = plan({
      id: 'cur',
      display_name: 'Current',
      features: { containers_per_account_max: -1 },
      usage_limits: { ai_summarize: 100 },
    });
    const target = plan({
      id: 'tgt_id',
      display_name: null as unknown as string,
      features: { containers_per_account_max: 1 },
      usage_limits: { ai_summarize: 10 },
    });
    const blockers = computeDowngradeBlockers(
      current,
      target,
      defaultOptions({ collectionCount: 5 }),
      [target],
      billingConfig
    );
    expect(blockers.hard.some(b => b.includes('tgt_id'))).toBe(true);
  });

  it('uses fallback exclusive plan name when no plan advertises the boolean feature', () => {
    const current = plan({
      id: 'cur',
      display_name: 'Current',
      features: {
        containers_per_account_max: -1,
        feature_b: true,
      },
      usage_limits: { ai_summarize: 100 },
    });
    const target = plan({
      id: 'tgt',
      display_name: 'Target',
      features: {
        containers_per_account_max: -1,
        feature_b: false,
      },
      usage_limits: { ai_summarize: 100 },
    });
    const blockers = computeDowngradeBlockers(
      current,
      target,
      defaultOptions({}),
      [target],
      billingConfig
    );
    expect(blockers.hard).toHaveLength(0);
    expect(blockers.soft.some(b => b.includes('a higher tier'))).toBe(true);
  });
});

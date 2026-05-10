import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { Plan } from '@beakerstack/billing';

const basePaidPlan = (over: Partial<Plan> & Pick<Plan, 'id'>): Plan => ({
  product_id: 'beakerstack',
  display_name: 'P',
  description: null,
  price_cents: over.price_cents ?? 1000,
  billing_period: 'monthly',
  stripe_price_id_monthly: null,
  stripe_price_id_annual: null,
  stripe_product_id: null,
  features: {},
  usage_limits: {},
  trial_period_days: 0,
  is_public: true,
  display_order: 1,
  ...over,
});

describe('billingSyncDisplay with mocked billing-sync.json', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('../billing-sync.json');
  });

  afterEach(() => {
    vi.doUnmock('../billing-sync.json');
    vi.resetModules();
  });

  it('planAnnualSavingsCopy returns percent when annual discount is not whole months', async () => {
    vi.doMock('../billing-sync.json', () => ({
      default: {
        plans: [
          {
            planId: 'frac',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 10500, interval: 'year' },
            ],
          },
        ],
      },
    }));
    const { planAnnualSavingsCopy } = await import('../billingSyncDisplay');
    expect(planAnnualSavingsCopy('frac', 1000)).toEqual({
      kind: 'percent',
      pct: 13,
    });
  });

  it('planAnnualSavingsCopy returns none when rounded percent is zero', async () => {
    vi.doMock('../billing-sync.json', () => ({
      default: {
        plans: [
          {
            planId: 'tiny',
            prices: [
              { unitAmount: 10000, interval: 'month' },
              { unitAmount: 119700, interval: 'year' },
            ],
          },
        ],
      },
    }));
    const { planAnnualSavingsCopy } = await import('../billingSyncDisplay');
    expect(planAnnualSavingsCopy('tiny', 10000)).toEqual({ kind: 'none' });
  });

  it('cadenceAnnualSavingsFromPlans returns months_range when month-free counts differ', async () => {
    vi.doMock('../billing-sync.json', () => ({
      default: {
        plans: [
          {
            planId: 'mo_lo',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 10000, interval: 'year' },
            ],
          },
          {
            planId: 'mo_hi',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 9000, interval: 'year' },
            ],
          },
        ],
      },
    }));
    const { cadenceAnnualSavingsFromPlans } =
      await import('../billingSyncDisplay');
    const plans: Plan[] = [
      basePaidPlan({ id: 'mo_lo', display_order: 1 }),
      basePaidPlan({ id: 'mo_hi', display_order: 2 }),
    ];
    expect(cadenceAnnualSavingsFromPlans(plans)).toEqual({
      kind: 'months_range',
      max: 3,
    });
  });

  it('cadenceAnnualSavingsFromPlans returns single percent when all plans agree on percent savings', async () => {
    vi.doMock('../billing-sync.json', () => ({
      default: {
        plans: [
          {
            planId: 'pct_a',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 10800, interval: 'year' },
            ],
          },
          {
            planId: 'pct_b',
            prices: [
              { unitAmount: 2000, interval: 'month' },
              { unitAmount: 21600, interval: 'year' },
            ],
          },
        ],
      },
    }));
    const { cadenceAnnualSavingsFromPlans } =
      await import('../billingSyncDisplay');
    const plans: Plan[] = [
      basePaidPlan({ id: 'pct_a', price_cents: 1000, display_order: 1 }),
      basePaidPlan({ id: 'pct_b', price_cents: 2000, display_order: 2 }),
    ];
    expect(cadenceAnnualSavingsFromPlans(plans)).toEqual({
      kind: 'percent',
      pct: 10,
    });
  });

  it('cadenceAnnualSavingsFromPlans returns percent_range when percent savings spread is wide', async () => {
    vi.doMock('../billing-sync.json', () => ({
      default: {
        plans: [
          {
            planId: 'wide_a',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 10800, interval: 'year' },
            ],
          },
          {
            planId: 'wide_b',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 9600, interval: 'year' },
            ],
          },
        ],
      },
    }));
    const { cadenceAnnualSavingsFromPlans } =
      await import('../billingSyncDisplay');
    const plans: Plan[] = [
      basePaidPlan({ id: 'wide_a', price_cents: 1000, display_order: 1 }),
      basePaidPlan({ id: 'wide_b', price_cents: 1000, display_order: 2 }),
    ];
    expect(cadenceAnnualSavingsFromPlans(plans)).toEqual({
      kind: 'percent_range',
      max: 20,
    });
  });

  it('cadenceAnnualSavingsFromPlans averages percent when spread is at most one point', async () => {
    vi.doMock('../billing-sync.json', () => ({
      default: {
        plans: [
          {
            planId: 'tight_a',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 10800, interval: 'year' },
            ],
          },
          {
            planId: 'tight_b',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 10700, interval: 'year' },
            ],
          },
        ],
      },
    }));
    const { cadenceAnnualSavingsFromPlans } =
      await import('../billingSyncDisplay');
    const plans: Plan[] = [
      basePaidPlan({ id: 'tight_a', price_cents: 1000, display_order: 1 }),
      basePaidPlan({ id: 'tight_b', price_cents: 1000, display_order: 2 }),
    ];
    expect(cadenceAnnualSavingsFromPlans(plans)).toEqual({
      kind: 'percent',
      pct: 11,
    });
  });

  it('cadenceAnnualSavingsFromPlans falls back to annual percent range when mix of months and percent', async () => {
    vi.doMock('../billing-sync.json', () => ({
      default: {
        plans: [
          {
            planId: 'mix_m',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 10000, interval: 'year' },
            ],
          },
          {
            planId: 'mix_p',
            prices: [
              { unitAmount: 1000, interval: 'month' },
              { unitAmount: 10800, interval: 'year' },
            ],
          },
        ],
      },
    }));
    const { cadenceAnnualSavingsFromPlans } =
      await import('../billingSyncDisplay');
    const plans: Plan[] = [
      basePaidPlan({ id: 'mix_m', price_cents: 1000, display_order: 1 }),
      basePaidPlan({ id: 'mix_p', price_cents: 1000, display_order: 2 }),
    ];
    expect(cadenceAnnualSavingsFromPlans(plans)).toEqual({
      kind: 'percent_range',
      max: 17,
    });
  });
});

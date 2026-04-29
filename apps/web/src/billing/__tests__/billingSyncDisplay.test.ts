import { describe, expect, it } from 'vitest';
import type { Plan } from '@beakerstack/billing';
import {
  annualListCentsFromSync,
  annualSavingsPercentForPlan,
  cadenceAnnualSavingsFromPlans,
  formatCadenceAnnualButtonLabel,
  formatCadenceToggleSavingsBadge,
  formatSavingsCalloutFromCopy,
  monthlyListCentsFromSync,
  planAnnualSavingsCopy,
} from '../billingSyncDisplay';

describe('billingSyncDisplay', () => {
  it('monthlyListCentsFromSync uses sync JSON when plan exists', () => {
    expect(monthlyListCentsFromSync('beakerstack_pro', 99999)).toBe(1900);
    expect(monthlyListCentsFromSync('beakerstack_max', 1)).toBe(4900);
  });

  it('monthlyListCentsFromSync falls back when plan is missing', () => {
    expect(monthlyListCentsFromSync('unknown_plan', 4200)).toBe(4200);
  });

  it('annualListCentsFromSync prefers yearly row in JSON', () => {
    expect(annualListCentsFromSync('beakerstack_pro', 1900)).toBe(19000);
  });

  it('annualListCentsFromSync uses 12× monthly when no yearly row', () => {
    expect(annualListCentsFromSync('unknown_plan', 1000)).toBe(12000);
  });

  it('planAnnualSavingsCopy returns months when discount matches whole months', () => {
    expect(planAnnualSavingsCopy('beakerstack_pro', 1900)).toEqual({
      kind: 'months',
      months: 2,
    });
  });

  it('planAnnualSavingsCopy returns none when annual is not cheaper', () => {
    expect(planAnnualSavingsCopy('unknown_plan', 0)).toEqual({ kind: 'none' });
  });

  it('formatSavingsCalloutFromCopy maps copy kinds', () => {
    expect(formatSavingsCalloutFromCopy({ kind: 'none' })).toBeNull();
    expect(formatSavingsCalloutFromCopy({ kind: 'months', months: 1 })).toBe(
      '1 Month Free'
    );
    expect(formatSavingsCalloutFromCopy({ kind: 'percent', pct: 15 })).toBe(
      'Save 15%'
    );
  });

  it('formatCadenceToggleSavingsBadge covers CadenceSavingsLabel variants', () => {
    expect(formatCadenceToggleSavingsBadge({ kind: 'none' })).toBeNull();
    expect(formatCadenceToggleSavingsBadge({ kind: 'months', months: 3 })).toBe(
      '3 Months Free'
    );
    expect(
      formatCadenceToggleSavingsBadge({ kind: 'months_range', max: 4 })
    ).toBe('Up to 4 Months Free');
    expect(formatCadenceToggleSavingsBadge({ kind: 'percent', pct: 12 })).toBe(
      'Save 12%'
    );
    expect(
      formatCadenceToggleSavingsBadge({ kind: 'percent_range', max: 20 })
    ).toBe('Save up to 20%');
  });

  it('formatCadenceAnnualButtonLabel prefixes Annually when badge present', () => {
    expect(formatCadenceAnnualButtonLabel({ kind: 'none' })).toBe('Annually');
    expect(formatCadenceAnnualButtonLabel({ kind: 'percent', pct: 10 })).toBe(
      'Annually · Save 10%'
    );
  });

  it('annualSavingsPercentForPlan returns percent or null', () => {
    const p = annualSavingsPercentForPlan('beakerstack_pro', 1900);
    expect(p).not.toBeNull();
    expect(p).toBeGreaterThan(0);
    expect(annualSavingsPercentForPlan('unknown_plan', 0)).toBeNull();
  });

  it('cadenceAnnualSavingsFromPlans aggregates paid plans', () => {
    const plans: Plan[] = [
      {
        id: 'beakerstack_pro',
        product_id: 'beakerstack',
        display_name: 'Pro',
        description: null,
        price_cents: 1900,
        billing_period: 'monthly',
        stripe_price_id_monthly: null,
        stripe_price_id_annual: null,
        stripe_product_id: null,
        features: {},
        usage_limits: {},
        trial_period_days: 0,
        is_public: true,
        display_order: 2,
      },
      {
        id: 'beakerstack_max',
        product_id: 'beakerstack',
        display_name: 'Max',
        description: null,
        price_cents: 4900,
        billing_period: 'monthly',
        stripe_price_id_monthly: null,
        stripe_price_id_annual: null,
        stripe_product_id: null,
        features: {},
        usage_limits: {},
        trial_period_days: 0,
        is_public: true,
        display_order: 3,
      },
    ];
    const agg = cadenceAnnualSavingsFromPlans(plans);
    expect(agg.kind).not.toBe('none');
  });
});

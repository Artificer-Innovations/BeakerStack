import { describe, expect, it } from 'vitest';
import {
  defineBillingConfig,
  planFeatureRowSchema,
  productBillingConfigSchema,
} from './schema.js';

const validPlan = {
  id: 'p1',
  displayName: 'Pro',
  priceCents: 1000,
  billingPeriod: 'monthly' as const,
  features: { a: true },
  usageLimits: { m: 10 },
};

describe('defineBillingConfig', () => {
  it('returns parsed config for valid input', () => {
    const c = defineBillingConfig({
      productId: 'x',
      displayName: 'X',
      plans: [validPlan],
    });
    expect(c.productId).toBe('x');
    expect(c.plans[0].id).toBe('p1');
  });

  it('throws on invalid config', () => {
    expect(() =>
      defineBillingConfig({
        productId: '',
        displayName: 'X',
        plans: [validPlan],
      })
    ).toThrow();
  });
});

describe('planFeatureRowSchema', () => {
  it('accepts boolean row', () => {
    const row = planFeatureRowSchema.parse({
      id: '1',
      featureKey: 'f',
      kind: 'boolean',
      label: 'L',
    });
    expect(row.kind).toBe('boolean');
  });

  it('accepts number row', () => {
    const row = planFeatureRowSchema.parse({
      id: '2',
      featureKey: 'cap',
      kind: 'number',
      unlimitedLabel: '∞',
      limitedLabelTemplate: '{count}',
    });
    expect(row.kind).toBe('number');
  });
});

describe('productBillingConfigSchema', () => {
  it('accepts optional planFeatureRows and copy blocks', () => {
    const parsed = productBillingConfigSchema.parse({
      productId: 'prod',
      displayName: 'Prod',
      plans: [validPlan],
      planFeatureRows: [
        {
          id: 'b',
          featureKey: 'a',
          kind: 'boolean',
          label: 'A',
        },
      ],
      downgradeConstraintCopy: {
        collectionsOverCap: 'x',
      },
      usageMeterCopy: {
        m: { label: 'Meter' },
      },
      usageLimitsCopy: {
        collectionsRowName: 'C',
      },
    });
    expect(parsed.planFeatureRows).toHaveLength(1);
    expect(parsed.downgradeConstraintCopy?.collectionsOverCap).toBe('x');
  });
});

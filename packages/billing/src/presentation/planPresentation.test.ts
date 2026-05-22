import { describe, expect, it } from 'vitest';
import type { Plan } from '../types.js';
import type { ProductBillingConfig } from '../schema.js';
import {
  applyTemplate,
  booleanFeatureLabel,
  DEFAULT_PLAN_FEATURE_ROWS,
  exclusiveBooleanFeaturePlanName,
  mergeDowngradeConstraintCopy,
  mergePlanFeatureRows,
  mergeUsageLimitsCopy,
  mergeUsageMeterCopy,
  planFeatureLine,
} from './planPresentation.js';

const basePlan = (over: Partial<Plan>): Plan => ({
  id: 'p1',
  product_id: 'prod',
  display_name: 'Test',
  description: null,
  price_cents: 0,
  billing_period: 'free',
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

const minimalConfig = (
  overrides: Partial<ProductBillingConfig> = {}
): ProductBillingConfig => ({
  productId: 'demo',
  displayName: 'Demo',
  plans: [
    {
      id: 'free',
      displayName: 'Free',
      priceCents: 0,
      billingPeriod: 'free',
      features: { feature_a: false, feature_b: false, x: 0 },
      usageLimits: { ai_summarize: 10 },
    },
  ],
  ...overrides,
});

describe('applyTemplate', () => {
  it('replaces known placeholders', () => {
    expect(applyTemplate('a {b} c', { b: 2 })).toBe('a 2 c');
  });

  it('uses empty string for missing keys', () => {
    expect(applyTemplate('{missing}', { other: 1 })).toBe('');
  });

  it('returns empty string when template is undefined', () => {
    expect(applyTemplate(undefined, { a: 1 })).toBe('');
  });
});

describe('mergePlanFeatureRows', () => {
  it('returns defaults when planFeatureRows is omitted', () => {
    const cfg = minimalConfig();
    expect(mergePlanFeatureRows(cfg)).toEqual(DEFAULT_PLAN_FEATURE_ROWS);
  });

  it('returns defaults when planFeatureRows is empty', () => {
    const cfg = minimalConfig({ planFeatureRows: [] });
    expect(mergePlanFeatureRows(cfg)).toEqual(DEFAULT_PLAN_FEATURE_ROWS);
  });

  it('returns custom rows when provided', () => {
    const rows = [
      {
        id: '1',
        featureKey: 'feature_a',
        kind: 'boolean' as const,
        label: 'Custom A',
      },
    ];
    expect(
      mergePlanFeatureRows(minimalConfig({ planFeatureRows: rows }))
    ).toEqual(rows);
  });
});

describe('mergeDowngradeConstraintCopy', () => {
  it('fills defaults for missing fields', () => {
    const m = mergeDowngradeConstraintCopy(minimalConfig());
    expect(m.collectionsOverCap).toContain('{current}');
    expect(m.booleanFeatureLoss).toContain('{featureLabel}');
    expect(m.booleanFeatureLoss).toContain('{targetPlanName}');
    expect(m.meterOverCap).toContain('{used}');
    expect(m.itemsPerCollectionOverCap).toContain('{maxItems}');
  });

  it('merges partial overrides', () => {
    const m = mergeDowngradeConstraintCopy(
      minimalConfig({
        downgradeConstraintCopy: {
          meterOverCap: 'Custom {used}',
        },
      })
    );
    expect(m.meterOverCap).toBe('Custom {used}');
    expect(m.collectionsOverCap).toContain('collections');
  });
});

describe('planFeatureLine', () => {
  const plan = basePlan({
    features: {
      feature_a: true,
      feature_b: false,
      cap: 5,
      unlimited: -1,
      zero: 0,
      bad: 'x' as unknown as number,
    },
  });

  it('handles boolean rows', () => {
    expect(
      planFeatureLine(plan, {
        id: 'a',
        featureKey: 'feature_a',
        kind: 'boolean',
        label: 'A',
      })
    ).toEqual({ ok: true, text: 'A' });
    expect(
      planFeatureLine(plan, {
        id: 'b',
        featureKey: 'feature_b',
        kind: 'boolean',
        label: 'B',
      })
    ).toEqual({ ok: false, text: 'B' });
  });

  it('treats -1 as unlimited for number rows', () => {
    expect(
      planFeatureLine(plan, {
        id: 'u',
        featureKey: 'unlimited',
        kind: 'number',
        unlimitedLabel: 'All',
        limitedLabelTemplate: 'Up to {count}',
      })
    ).toEqual({ ok: true, text: 'All' });
  });

  it('formats positive caps', () => {
    expect(
      planFeatureLine(plan, {
        id: 'c',
        featureKey: 'cap',
        kind: 'number',
        unlimitedLabel: 'All',
        limitedLabelTemplate: '{count} max',
      })
    ).toEqual({ ok: true, text: '5 max' });
  });

  it('treats zero and non-number as not ok with limited template', () => {
    expect(
      planFeatureLine(plan, {
        id: 'z',
        featureKey: 'zero',
        kind: 'number',
        unlimitedLabel: 'All',
        limitedLabelTemplate: '{count} max',
      })
    ).toEqual({ ok: false, text: '0 max' });

    expect(
      planFeatureLine(plan, {
        id: 'bad',
        featureKey: 'bad',
        kind: 'number',
        unlimitedLabel: 'All',
        limitedLabelTemplate: '{count} max',
      })
    ).toEqual({ ok: false, text: '0 max' });
  });
});

describe('booleanFeatureLabel', () => {
  it('returns row label when present', () => {
    expect(booleanFeatureLabel(minimalConfig(), 'feature_a')).toBe('Feature A');
  });

  it('falls back to feature key when no boolean row matches', () => {
    expect(booleanFeatureLabel(minimalConfig(), 'unknown_key')).toBe(
      'unknown_key'
    );
  });
});

describe('exclusiveBooleanFeaturePlanName', () => {
  const plans: Plan[] = [
    basePlan({
      id: '1',
      display_name: 'Low',
      display_order: 1,
      features: { feature_b: false },
    }),
    basePlan({
      id: '2',
      display_name: 'High',
      display_order: 3,
      features: { feature_b: true },
    }),
    basePlan({
      id: '3',
      display_name: 'Mid',
      display_order: 2,
      features: { feature_b: 1 },
    }),
  ];

  it('returns null when no plan has the feature', () => {
    expect(exclusiveBooleanFeaturePlanName([plans[0]], 'feature_b')).toBeNull();
  });

  it('picks highest display_order among holders', () => {
    expect(exclusiveBooleanFeaturePlanName(plans, 'feature_b')).toBe('High');
  });

  it('picks highest display_order among holders with explicit order values', () => {
    const ranked = [
      basePlan({
        id: 'lo',
        display_name: 'Low',
        display_order: 1,
        features: { feature_x: true },
      }),
      basePlan({
        id: 'hi',
        display_name: 'Hi',
        display_order: 5,
        features: { feature_x: true },
      }),
    ] as Plan[];
    expect(exclusiveBooleanFeaturePlanName(ranked, 'feature_x')).toBe('Hi');
  });

  it('sorts holders treating missing display_order as zero', () => {
    const ranked = [
      basePlan({
        id: 'lo',
        display_name: 'Low',
        display_order: undefined,
        features: { feature_x: true },
      }),
      basePlan({
        id: 'hi',
        display_name: 'Hi',
        display_order: 5,
        features: { feature_x: true },
      }),
    ] as Plan[];
    expect(exclusiveBooleanFeaturePlanName(ranked, 'feature_x')).toBe('Hi');
  });

  it('sorts holders when display_order is null', () => {
    const ranked = [
      basePlan({
        id: 'a',
        display_name: 'A',
        display_order: null as unknown as number,
        features: { feature_x: true },
      }),
      basePlan({
        id: 'b',
        display_name: 'B',
        display_order: null as unknown as number,
        features: { feature_x: true },
      }),
    ] as Plan[];
    expect(exclusiveBooleanFeaturePlanName(ranked, 'feature_x')).toBe('A');
  });

  it('returns null when top holder has no display name', () => {
    const holderNoName = basePlan({
      id: 'top',
      display_name: null as unknown as string,
      display_order: 9,
      features: { feature_b: true },
    });
    expect(
      exclusiveBooleanFeaturePlanName([holderNoName], 'feature_b')
    ).toBeNull();
  });

  it('returns null when display_name is undefined after sort', () => {
    const holder = basePlan({
      id: 'top',
      display_name: undefined as unknown as string,
      display_order: 5,
      features: { feature_z: true },
    });
    expect(exclusiveBooleanFeaturePlanName([holder], 'feature_z')).toBeNull();
  });
});

describe('mergeUsageMeterCopy', () => {
  it('starts from defaults and merges overrides', () => {
    const m = mergeUsageMeterCopy(minimalConfig());
    expect(m.ai_summarize?.label).toBe('AI summarize');

    const m2 = mergeUsageMeterCopy(
      minimalConfig({
        usageMeterCopy: {
          ai_summarize: { label: 'Renamed', description: 'D' },
          other: { label: 'Other' },
        },
      })
    );
    expect(m2.ai_summarize).toEqual({
      label: 'Renamed',
      description: 'D',
    });
    expect(m2.other).toEqual({ label: 'Other' });
  });

  it('keeps label-only overrides without description on new meters', () => {
    const m = mergeUsageMeterCopy(
      minimalConfig({
        usageMeterCopy: {
          custom_meter: { label: 'Custom only' },
        },
      })
    );
    expect(m.custom_meter).toEqual({ label: 'Custom only' });
  });

  it('inherits default label when override omits label', () => {
    const m = mergeUsageMeterCopy(
      minimalConfig({
        usageMeterCopy: {
          ai_summarize: { description: 'Custom description' },
        },
      })
    );
    expect(m.ai_summarize).toEqual({
      label: 'AI summarize',
      description: 'Custom description',
    });
  });

  it('falls back to meter key when override omits label on a new meter', () => {
    const m = mergeUsageMeterCopy(
      minimalConfig({
        usageMeterCopy: {
          brand_new_meter: {},
        },
      })
    );
    expect(m.brand_new_meter).toEqual({ label: 'brand_new_meter' });
  });

  it('uses explicit label when override provides one', () => {
    const m = mergeUsageMeterCopy(
      minimalConfig({
        usageMeterCopy: {
          ai_summarize: { label: 'Explicit label' },
        },
      })
    );
    expect(m.ai_summarize?.label).toBe('Explicit label');
  });
});

describe('mergeUsageLimitsCopy', () => {
  it('merges over defaults', () => {
    const m = mergeUsageLimitsCopy(
      minimalConfig({
        usageLimitsCopy: { collectionsRowName: 'Cols' },
      })
    );
    expect(m.collectionsRowName).toBe('Cols');
    expect(m.itemsRowName).toContain('Items');
  });

  it('treats null usageLimitsCopy like empty overrides', () => {
    const m = mergeUsageLimitsCopy({
      ...minimalConfig(),
      usageLimitsCopy: null,
    } as unknown as ProductBillingConfig);
    expect(m.collectionsRowName).toContain('Collections');
  });
});

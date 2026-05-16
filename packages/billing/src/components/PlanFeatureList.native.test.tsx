import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Plan } from '../types.js';
import { PlanFeatureList } from './PlanFeatureList.native.js';

vi.mock('../hooks/useBillingConfig.js', () => ({
  useBillingConfig: () => ({
    productId: 'beakerstack',
    planFeatureRows: [
      {
        id: 'a',
        featureKey: 'feature_a',
        kind: 'boolean',
        label: 'Feature A',
      },
      {
        id: 'b',
        featureKey: 'feature_b',
        kind: 'boolean',
        label: 'Feature B',
      },
    ],
  }),
}));

const plan: Plan = {
  id: 'beakerstack_pro',
  product_id: 'beakerstack',
  display_name: 'Pro',
  description: null,
  price_cents: 1900,
  billing_period: 'monthly',
  stripe_price_id_monthly: null,
  stripe_price_id_annual: null,
  stripe_product_id: null,
  features: { feature_a: true, feature_b: false },
  usage_limits: {},
  trial_period_days: 0,
  is_public: true,
  display_order: 2,
};

describe('PlanFeatureList (native)', () => {
  it("renders What's included with feature labels (not Yes/No)", () => {
    render(<PlanFeatureList plan={plan} />);
    expect(screen.getByText("What's included")).toBeTruthy();
    expect(screen.getByText('Feature A')).toBeTruthy();
    expect(screen.getByText('Feature B')).toBeTruthy();
    expect(screen.queryByText('Yes')).toBeNull();
    expect(screen.queryByText('No')).toBeNull();
  });
});

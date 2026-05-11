import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Plan } from '@beakerstack/billing';
import { beakerstackBillingConfig } from '@/billing/beakerstackBillingConfig';
import { PlanFeatureList } from '../PlanFeatureList.web';

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useBillingConfig: () => beakerstackBillingConfig,
  };
});

const freePlan: Plan = {
  id: 'beakerstack_free',
  product_id: 'beakerstack',
  display_name: 'Free',
  description: null,
  price_cents: 0,
  billing_period: 'free',
  stripe_price_id_monthly: null,
  stripe_price_id_annual: null,
  stripe_product_id: null,
  features: {
    feature_a: false,
    feature_b: false,
    containers_per_account_max: 2,
    items_per_container_max: 3,
  },
  usage_limits: { ai_summarize: 30 },
  trial_period_days: 0,
  is_public: true,
  display_order: 1,
};

describe('PlanFeatureList', () => {
  it('renders section title and feature lines', () => {
    render(<PlanFeatureList plan={freePlan} />);
    expect(screen.getByText("What's included")).toBeInTheDocument();
    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Up to 2 collections')).toBeInTheDocument();
  });

  it('renders X icon row when a boolean feature is off', () => {
    const { container } = render(<PlanFeatureList plan={freePlan} />);
    const featureAListItem = screen.getByText('Feature A').closest('li');
    expect(featureAListItem?.querySelector('.text-gray-300')).toBeTruthy();
    expect(container.querySelector('.text-green-600')).toBeTruthy();
  });

  it('accepts public mode without changing output', () => {
    render(<PlanFeatureList plan={freePlan} mode='public' />);
    expect(screen.getByText("What's included")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingTable } from '../PricingTable.web';

const MOCK_PLANS = [
  {
    id: 'plan_free',
    product_id: 'prod_test',
    display_name: 'Free',
    description: null,
    price_cents: 0,
    billing_period: 'free',
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    stripe_product_id: null,
    features: { ai_summarize: false },
    usage_limits: { collections: 3 },
    trial_period_days: 0,
    is_public: true,
    display_order: 0,
  },
  {
    id: 'plan_pro',
    product_id: 'prod_test',
    display_name: 'Pro',
    description: 'Full access',
    price_cents: 1900,
    billing_period: 'monthly',
    stripe_price_id_monthly: 'price_pro_monthly',
    stripe_price_id_annual: null,
    stripe_product_id: 'prod_pro',
    features: { ai_summarize: true },
    usage_limits: { collections: 100 },
    trial_period_days: 0,
    is_public: true,
    display_order: 1,
  },
];

vi.mock('../../hooks/usePlanCatalog.js', () => ({
  usePlanCatalog: () => ({ plans: MOCK_PLANS, loading: false, error: null }),
}));

vi.mock('../../hooks/usePlan.js', () => ({
  usePlan: () => ({ data: MOCK_PLANS[1] }),
}));

describe('PricingTable', () => {
  it('shows "Select" buttons when authenticated', () => {
    render(<PricingTable isAuthenticated={true} onCheckout={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Select' })).toHaveLength(2);
  });

  it('shows "Get started" buttons when unauthenticated', () => {
    render(<PricingTable isAuthenticated={false} onCheckout={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Get started' })).toHaveLength(
      2
    );
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull();
  });

  it('suppresses current-plan highlight when unauthenticated', () => {
    const { container } = render(
      <PricingTable
        isAuthenticated={false}
        highlightCurrent={true}
        onCheckout={() => {}}
      />
    );
    const items = container.querySelectorAll('li');
    items.forEach(li => {
      expect(li.style.border).not.toContain('#3b82f6');
    });
  });

  it('fires onCheckout with planId when Get started is clicked', async () => {
    const onCheckout = vi.fn();
    render(<PricingTable isAuthenticated={false} onCheckout={onCheckout} />);
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Get started' })[1]
    );
    expect(onCheckout).toHaveBeenCalledWith('plan_pro');
  });
});

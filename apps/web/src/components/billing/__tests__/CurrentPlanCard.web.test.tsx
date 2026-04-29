import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Plan, SubscriptionRow } from '@beakerstack/billing';
import { CurrentPlanCard } from '../CurrentPlanCard.web';

vi.mock('@beakerstack/billing/web', () => ({
  SubscriptionStatusBadge: () => <span>badge</span>,
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
  features: {},
  usage_limits: {},
  trial_period_days: 0,
  is_public: true,
  display_order: 2,
};

const subscription: SubscriptionRow = {
  id: 's1',
  user_id: 'u1',
  product_id: 'beakerstack',
  plan_id: 'beakerstack_pro',
  stripe_customer_id: 'cus',
  stripe_subscription_id: 'sub',
  stripe_price_id: 'price',
  status: 'active',
  current_period_start: null,
  current_period_end: new Date(Date.now() + 864e5 * 30).toISOString(),
  cancel_at_period_end: false,
  pending_target_plan_id: null,
  canceled_at: null,
  trial_start: null,
  trial_end: null,
};

describe('CurrentPlanCard', () => {
  it('returns null when plan is missing', () => {
    const { container } = render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={null}
          subscription={null}
          isFree
          onManagePayment={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders free messaging when isFree', () => {
    render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={plan}
          subscription={null}
          isFree
          onManagePayment={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: /Free plan/i })
    ).toBeInTheDocument();
  });

  it('renders paid plan with manage action', () => {
    const onManage = vi.fn();
    render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={plan}
          subscription={subscription}
          isFree={false}
          onManagePayment={onManage}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Manage payment/i })
    ).toBeInTheDocument();
  });

  it('hides manage payment when stripe customer id is missing', () => {
    render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={plan}
          subscription={{ ...subscription, stripe_customer_id: null }}
          isFree={false}
          onManagePayment={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(
      screen.queryByRole('button', { name: /Manage payment/i })
    ).not.toBeInTheDocument();
  });
});

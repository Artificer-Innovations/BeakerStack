import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Plan, SubscriptionRow } from '@beakerstack/billing';
import { CurrentPlanCard } from '../CurrentPlanCard.web';

type BillingCadence = 'monthly' | 'annual';

const resolveCadenceMock = vi.hoisted(() =>
  vi.fn(
    (_plan: Plan | null, _sub: SubscriptionRow | null): BillingCadence | null =>
      'monthly'
  )
);

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    resolveCadence: (plan: Plan | null, sub: SubscriptionRow | null) =>
      resolveCadenceMock(plan, sub),
  };
});

vi.mock('@beakerstack/billing/web', () => ({
  SubscriptionStatusBadge: () => <span>badge</span>,
}));

vi.mock('@beakerstack/billing/presentation', () => ({
  annualListCentsFromSync: vi.fn(() => 22_800),
  formatMoneyCents: vi.fn((c: number) => `$${(c / 100).toFixed(2)}`),
  formatDate: vi.fn((iso: string) => `d:${iso.slice(0, 10)}`),
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
  beforeEach(() => {
    resolveCadenceMock.mockReturnValue('monthly');
  });

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

  it('shows annual price when cadence resolves to annual', () => {
    resolveCadenceMock.mockReturnValue('annual');
    render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={plan}
          subscription={subscription}
          isFree={false}
          onManagePayment={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/\$228\.00\/year/i)).toBeInTheDocument();
  });

  it('renders periodSubcopy when provided for paid subscription', () => {
    render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={plan}
          subscription={subscription}
          isFree={false}
          onManagePayment={vi.fn()}
          periodSubcopy='Downgrade scheduled — ends Aug 1'
        />
      </MemoryRouter>
    );
    expect(
      screen.getByText('Downgrade scheduled — ends Aug 1')
    ).toBeInTheDocument();
  });

  it('shows Ends on when cancel_at_period_end', () => {
    render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={plan}
          subscription={{
            ...subscription,
            cancel_at_period_end: true,
          }}
          isFree={false}
          onManagePayment={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/^Ends on /)).toBeInTheDocument();
  });

  it('shows Trial copy when status is trialing', () => {
    render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={plan}
          subscription={{
            ...subscription,
            status: 'trialing',
            trial_end: new Date(Date.now() + 864e5 * 5).toISOString(),
          }}
          isFree={false}
          onManagePayment={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/^Trial — ends /)).toBeInTheDocument();
  });

  it('shows Renews on by default for active paid subscription', () => {
    render(
      <MemoryRouter>
        <CurrentPlanCard
          plan={plan}
          subscription={subscription}
          isFree={false}
          onManagePayment={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/^Renews on /)).toBeInTheDocument();
  });
});

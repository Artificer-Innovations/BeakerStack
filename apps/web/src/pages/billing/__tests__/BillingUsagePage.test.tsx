import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Plan } from '@beakerstack/billing';
import BillingUsagePage from '../BillingUsagePage';

vi.mock('@/components/billing/BillingPageShell.web', () => ({
  BillingPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@beakerstack/billing/web', () => ({
  UsageIndicator: (props: { label?: string }) => (
    <div data-testid='usage-indicator'>{props.label ?? 'meter'}</div>
  ),
}));

vi.mock('@/billing/useDemoCollectionCount', () => ({
  useDemoCollectionCount: () => ({
    count: 3,
    maxItemsInAnyCollection: 12,
    loading: false,
  }),
}));

const mockPlan: Plan = {
  id: 'beakerstack_pro',
  product_id: 'beakerstack',
  display_name: 'Pro',
  description: null,
  price_cents: 1900,
  billing_period: 'monthly',
  stripe_price_id_monthly: null,
  stripe_price_id_annual: null,
  stripe_product_id: null,
  features: {
    feature_a: true,
    feature_b: false,
    containers_per_account_max: -1,
    items_per_container_max: 25,
  },
  usage_limits: { ai_summarize: 500 },
  trial_period_days: 0,
  is_public: true,
  display_order: 2,
};

const billingTestState = vi.hoisted(() => ({
  plan: null as Plan | null,
  kind: 'paid_active' as
    | 'paid_active'
    | 'free'
    | 'payment_failed'
    | 'trial_ending',
  subscription: {
    id: 'sub-row',
    user_id: 'u1',
    product_id: 'beakerstack',
    plan_id: 'beakerstack_pro',
    stripe_customer_id: 'cus_x',
    stripe_subscription_id: 'sub_x',
    stripe_price_id: 'price_x',
    status: 'active',
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    canceled_at: null,
    trial_start: null,
    trial_end: null,
  },
}));

const subscriptionBase = {
  id: 'sub-row',
  user_id: 'u1',
  product_id: 'beakerstack',
  plan_id: 'beakerstack_pro',
  stripe_customer_id: 'cus_x',
  stripe_subscription_id: 'sub_x',
  stripe_price_id: 'price_x',
  status: 'active',
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  canceled_at: null,
  trial_start: null,
  trial_end: null,
};

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  const testBillingConfig = actual.defineBillingConfig({
    productId: 'beakerstack',
    displayName: 'Beaker Stack',
    description: 'test',
    plans: [
      {
        id: 'beakerstack_pro',
        displayName: 'Pro',
        priceCents: 1900,
        billingPeriod: 'monthly',
        stripePriceIdMonthly: null,
        stripePriceIdAnnual: null,
        stripeProductId: null,
        features: {
          feature_a: true,
          feature_b: false,
          containers_per_account_max: -1,
          items_per_container_max: 25,
        },
        usageLimits: { ai_summarize: 500 },
        trialPeriodDays: 0,
        isPublic: true,
        displayOrder: 2,
      },
    ],
    usageMeterCopy: {
      ai_summarize: {
        label: 'AI summarize',
        description: 'Test meter description.',
      },
    },
    usageLimitsCopy: {
      collectionsRowName: 'Collections',
      itemsRowName: 'Items per collection (max in one collection)',
      collectionsFootnote: 'Test footnote.',
    },
  });
  return {
    ...actual,
    useBillingConfig: () => testBillingConfig,
    usePlan: () => ({ data: billingTestState.plan }),
    useBillingState: () => ({
      kind: billingTestState.kind,
      subscription: billingTestState.subscription,
    }),
  };
});

describe('BillingUsagePage', () => {
  beforeEach(() => {
    billingTestState.plan = mockPlan;
    billingTestState.kind = 'paid_active';
    Object.assign(billingTestState.subscription, subscriptionBase);
  });

  it('shows loading when plan is missing', () => {
    billingTestState.plan = null;
    render(
      <MemoryRouter>
        <BillingUsagePage />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading plan…')).toBeInTheDocument();
  });

  it('renders usage, limits, and plan features for an active subscription', () => {
    render(
      <MemoryRouter>
        <BillingUsagePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Usage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Limits' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Plan features' })
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('usage-indicator').length).toBeGreaterThan(0);
    expect(screen.getByText(/next billing date/i)).toBeInTheDocument();
  });

  it('shows payment failed banner', () => {
    billingTestState.kind = 'payment_failed';
    Object.assign(billingTestState.subscription, subscriptionBase, {
      status: 'past_due',
    });
    render(
      <MemoryRouter>
        <BillingUsagePage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Payment failed/i)).toBeInTheDocument();
  });

  it('does not show trial-ending banner when trial_ending', () => {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    billingTestState.kind = 'trial_ending';
    Object.assign(billingTestState.subscription, subscriptionBase, {
      status: 'trialing',
      trial_end: soon,
    });
    render(
      <MemoryRouter>
        <BillingUsagePage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/trial is ending/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Usage' })).toBeInTheDocument();
  });

  it('shows free-tier reset copy without stripe subscription', () => {
    billingTestState.kind = 'free';
    Object.assign(billingTestState.subscription, subscriptionBase, {
      status: 'free',
      stripe_subscription_id: null,
    });
    render(
      <MemoryRouter>
        <BillingUsagePage />
      </MemoryRouter>
    );
    expect(screen.getByText(/calendar month/i)).toBeInTheDocument();
  });

  it('renders numeric cap for containers when plan has a finite limit', () => {
    billingTestState.plan = {
      ...mockPlan,
      features: {
        ...mockPlan.features,
        containers_per_account_max: 5,
        items_per_container_max: -1,
      },
    };
    render(
      <MemoryRouter>
        <BillingUsagePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Limits' })).toBeInTheDocument();
  });

  it('falls back to meter key when no usage meter copy is configured', () => {
    billingTestState.plan = {
      ...mockPlan,
      usage_limits: { ai_summarize: 500, unknown_meter: 100 },
    };
    render(
      <MemoryRouter>
        <BillingUsagePage />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId('usage-indicator').length).toBe(2);
    expect(screen.getByText('unknown_meter')).toBeInTheDocument();
  });
});

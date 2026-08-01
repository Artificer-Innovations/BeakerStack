import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { BillingUiStateKind, Plan } from '@beakerstack/billing';
import BillingOverviewPage from '../BillingOverviewPage';

const state = vi.hoisted(() => {
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
  return {
    plan,
    kind: 'paid_active' as BillingUiStateKind,
    subscription: {
      id: 's1',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_x',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    },
  };
});

const { reactivateSpy } = vi.hoisted(() => ({
  reactivateSpy: vi.fn().mockResolvedValue(true),
}));

const ov = vi.hoisted(() => ({
  portalError: null as Error | null,
  stripeActionErr: null as Error | null,
  planLoading: false,
  usageLimit: 500 as number | null,
  usageLoading: false,
  invoiceItems: [] as Array<{
    id: string;
    created_at: string;
    status: string;
    amount_paid: number;
    currency: string;
    description?: string | null;
  }>,
  invoiceLoading: false,
  authUser: { created_at: '2024-01-15T00:00:00.000Z' } as {
    created_at?: string;
  } | null,
  collectionCount: 2 as number | null | undefined,
  collectionLoading: false,
}));

const openPortalSpy = vi.hoisted(() => vi.fn());

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useBillingState: () => ({
      kind: state.kind,
      subscription: state.subscription,
    }),
    usePlanCatalog: () => ({
      plans: [
        {
          id: 'beakerstack_free',
          product_id: 'beakerstack',
          display_name: 'Free',
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
        },
        state.plan,
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
    useBillingStripeActions: () => ({
      reactivateSubscription: reactivateSpy,
      cancelSubscriptionImmediately: vi.fn().mockResolvedValue(true),
      updateSubscription: vi.fn(),
      scheduleCancelToFree: vi.fn(),
      pending: false,
      error: ov.stripeActionErr,
    }),
    useCustomerPortal: () => ({
      openPortal: openPortalSpy,
      pending: false,
      error: ov.portalError,
    }),
    usePlan: () => ({
      data: state.plan,
      loading: ov.planLoading,
      error: null,
    }),
    useUsage: () => ({
      used: 3,
      limit: ov.usageLimit,
      remaining: ov.usageLimit != null ? Math.max(0, ov.usageLimit - 3) : null,
      resetsAt: '',
      loading: ov.usageLoading,
      error: null,
      exceeded: false,
      refresh: vi.fn(),
    }),
    useInvoices: () => ({
      items: ov.invoiceItems,
      loading: ov.invoiceLoading,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
    }),
  };
});

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: ov.authUser,
  }),
}));

vi.mock('@adopter/web/billing/useDemoCollectionCount', () => ({
  useDemoCollectionCount: () => ({
    count: ov.collectionCount,
    loading: ov.collectionLoading,
  }),
}));

vi.mock('@/components/billing/BillingPageShell.web', () => ({
  BillingPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('BillingOverviewPage', () => {
  beforeEach(() => {
    reactivateSpy.mockClear();
    openPortalSpy.mockClear();
    vi.stubGlobal('location', { ...window.location, reload: vi.fn() });
    ov.portalError = null;
    ov.stripeActionErr = null;
    ov.planLoading = false;
    ov.usageLimit = 500;
    ov.usageLoading = false;
    ov.invoiceItems = [];
    ov.invoiceLoading = false;
    ov.authUser = { created_at: '2024-01-15T00:00:00.000Z' };
    ov.collectionCount = 2;
    ov.collectionLoading = false;
    state.kind = 'paid_active';
    Object.assign(state.subscription, {
      stripe_subscription_id: 'sub_x',
      status: 'active',
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      trial_end: null,
      current_period_end: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows Billing overview heading and usage stats', () => {
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Billing' })
    ).toBeInTheDocument();
    expect(screen.getByText(/AI summaries/i)).toBeInTheDocument();
  });

  it('shows reactivate for cancelled_pending', () => {
    state.kind = 'cancelled_pending';
    Object.assign(state.subscription, {
      cancel_at_period_end: true,
      current_period_end: '2026-12-31T00:00:00.000Z',
    });
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    const btn = screen.getByRole('button', {
      name: /Reactivate subscription/i,
    });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(reactivateSpy).toHaveBeenCalled();
  });

  it('shows free-plan headline when treating plan as free', () => {
    state.kind = 'free';
    Object.assign(state.subscription, {
      stripe_subscription_id: null,
      status: 'free',
    });
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: /Free plan/i })
    ).toBeInTheDocument();
  });

  it('shows portal error banner', () => {
    ov.portalError = new Error('Portal blocked');
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(
      screen.getByText(/Could not open billing portal/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Portal blocked/i)).toBeInTheDocument();
  });

  it('shows Stripe subscription action error banner', () => {
    ov.stripeActionErr = new Error('Stripe action failed');
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Subscription action failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Stripe action failed/i)).toBeInTheDocument();
  });

  it('shows payment failed banner', () => {
    state.kind = 'payment_failed';
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Payment problem')).toBeInTheDocument();
    expect(
      screen.getByText(/Your last payment did not go through/i)
    ).toBeInTheDocument();
  });

  it('shows downgrade pending banner and period copy on plan card', () => {
    state.kind = 'downgrade_pending';
    Object.assign(state.subscription, {
      stripe_subscription_id: 'sub_x',
      pending_target_plan_id: 'beakerstack_free',
      current_period_end: '2026-07-01T00:00:00.000Z',
      cancel_at_period_end: true,
    });
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Plan change scheduled/i)).toBeInTheDocument();
    expect(screen.getByText(/You'll move to Free on/i)).toBeInTheDocument();
  });

  it('shows loading skeleton when plan is loading in loading billing state', () => {
    state.kind = 'loading';
    ov.planLoading = true;
    const { container } = render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows unlimited usage copy when meter has no limit', () => {
    ov.usageLimit = null;
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText('3 used (unlimited)')).toBeInTheDocument();
  });

  it('shows recent invoices for paid users when invoice list loads', () => {
    ov.invoiceItems = [
      {
        id: 'inv_1',
        created_at: '2026-01-10T00:00:00.000Z',
        status: 'paid',
        amount_paid: 1900,
        currency: 'usd',
        description: 'Pro',
      },
    ];
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Recent activity/i)).toBeInTheDocument();
  });

  it('shows em dash for member since when user has no created_at', () => {
    ov.authUser = { created_at: undefined };
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    const label = screen.getByText('Member since');
    const card = label.closest('.rounded-xl');
    expect(card).toBeTruthy();
    expect(within(card as HTMLElement).getByText('—')).toBeInTheDocument();
  });

  it('shows em dash for usage stat while usage is loading', () => {
    ov.usageLoading = true;
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    const label = screen.getByText("This month's usage");
    const card = label.closest('.rounded-xl');
    expect(within(card as HTMLElement).getByText('—')).toBeInTheDocument();
  });

  it('shows em dash for collections stat while collection count is loading', () => {
    ov.collectionLoading = true;
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    const label = screen.getByText('Collections');
    const card = label.closest('.rounded-xl');
    expect(within(card as HTMLElement).getByText('—')).toBeInTheDocument();
  });

  it('shows 0 of unlimited for collections when count is missing and cap is unlimited', () => {
    ov.collectionCount = null;
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText('0 of unlimited')).toBeInTheDocument();
  });

  it('shows 0 of <cap> for collections when count is missing and cap is finite', () => {
    ov.collectionCount = null;
    state.plan = {
      ...state.plan,
      features: { ...state.plan.features, containers_per_account_max: 7 },
    };
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText('0 of 7')).toBeInTheDocument();
  });

  it('falls back to "your next plan" when downgrade is pending without a target match', () => {
    state.kind = 'downgrade_pending';
    Object.assign(state.subscription, {
      stripe_subscription_id: 'sub_x',
      pending_target_plan_id: 'beakerstack_unknown',
      current_period_end: '2026-09-01T00:00:00.000Z',
      cancel_at_period_end: true,
    });
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Plan change scheduled/i)).toBeInTheDocument();
    expect(screen.getByText(/your next plan/i)).toBeInTheDocument();
  });

  it('invokes the customer portal when "Manage payment & invoices" is clicked', () => {
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Manage payment .* invoices/i })
    );
    expect(openPortalSpy).toHaveBeenCalled();
  });

  it('shows complimentary access banner when billing kind is comped', () => {
    state.kind = 'comped';
    Object.assign(state.subscription, {
      stripe_subscription_id: null,
      status: 'comped',
      plan_id: 'beakerstack_vip',
    });
    render(
      <MemoryRouter>
        <BillingOverviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Complimentary access')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Checkout and the Stripe customer portal are not available/i
      )
    ).toBeInTheDocument();
  });
});

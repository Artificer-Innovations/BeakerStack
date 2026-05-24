import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type {
  BillingUiStateKind,
  Plan,
  SubscriptionRow,
} from '@beakerstack/billing';
import { billingConfig } from '@adopter/config/billing';
import BillingPlansPage from '../BillingPlansPage';

const plansState = vi.hoisted(() => {
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
    features: {},
    usage_limits: {},
    trial_period_days: 0,
    is_public: true,
    display_order: 1,
  };
  const proPlan: Plan = {
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
  /** Same display tier as Pro — exercises getPrimary fallback when orders tie but ids differ. */
  const proTwinPlan: Plan = {
    id: 'beakerstack_pro_twin',
    product_id: 'beakerstack',
    display_name: 'Pro Twin',
    description: null,
    price_cents: 2900,
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
  const maxPlan: Plan = {
    id: 'beakerstack_max',
    product_id: 'beakerstack',
    display_name: 'Max',
    description: null,
    price_cents: 4900,
    billing_period: 'monthly',
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    stripe_product_id: null,
    features: {
      feature_a: true,
      feature_b: true,
      containers_per_account_max: -1,
      items_per_container_max: -1,
    },
    usage_limits: { ai_summarize: -1 },
    trial_period_days: 5,
    is_public: true,
    display_order: 3,
  };
  return {
    freePlan,
    proPlan,
    proTwinPlan,
    maxPlan,
    current: proPlan,
    catalogOverride: null as Plan[] | null,
    catLoading: false,
    currentNull: false,
    billingKind: 'paid_active' as BillingUiStateKind,
    subscription: {
      id: 's1',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_1',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    } as SubscriptionRow | null,
  };
});

const checkoutSpies = vi.hoisted(() => ({
  startCheckout: vi.fn().mockResolvedValue(null),
  updateSubscription: vi.fn().mockResolvedValue(true),
  scheduleCancelToFree: vi.fn().mockResolvedValue(true),
}));

const hookState = vi.hoisted(() => ({
  demoCount: 0 as number | null,
  demoMaxItems: 0 as number | null,
  aiUsed: 0 as number | null,
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useBillingConfig: () => billingConfig,
    usePlanCatalog: () => ({
      plans: plansState.catalogOverride ?? [
        plansState.freePlan,
        plansState.proPlan,
        plansState.proTwinPlan,
        plansState.maxPlan,
      ],
      loading: plansState.catLoading,
      error: null,
      refresh: vi.fn(),
    }),
    usePlan: () => ({
      data: plansState.currentNull ? null : plansState.current,
      loading: false,
      error: null,
    }),
    useSubscription: () => ({
      data: plansState.subscription,
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
    useCheckout: () => ({
      startCheckout: checkoutSpies.startCheckout,
      pending: false,
      error: null,
    }),
    useBillingState: () => ({
      kind: plansState.billingKind,
      plan: plansState.current,
      subscription: plansState.subscription,
    }),
    useBillingStripeActions: () => ({
      updateSubscription: checkoutSpies.updateSubscription,
      scheduleCancelToFree: checkoutSpies.scheduleCancelToFree,
      reactivateSubscription: vi.fn().mockResolvedValue(true),
      cancelSubscriptionImmediately: vi.fn().mockResolvedValue(true),
      pending: false,
      error: null,
    }),
    useUsage: () => ({
      used: hookState.aiUsed,
      limit: 10,
      remaining: 10,
      resetsAt: '',
      loading: false,
      error: null,
      exceeded: false,
      refresh: vi.fn(),
    }),
  };
});

vi.mock('@adopter/web/billing/useDemoCollectionCount', () => ({
  useDemoCollectionCount: () => ({
    count: hookState.demoCount,
    maxItemsInAnyCollection: hookState.demoMaxItems,
    loading: false,
  }),
}));

vi.mock('@/components/billing/BillingPageShell.web', () => ({
  BillingPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('BillingPlansPage', () => {
  const renderPage = (initialEntry = '/billing/plans') =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <BillingPlansPage />
      </MemoryRouter>
    );

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    plansState.catLoading = false;
    plansState.currentNull = false;
    checkoutSpies.startCheckout.mockReset();
    checkoutSpies.updateSubscription.mockReset();
    checkoutSpies.scheduleCancelToFree.mockReset();
    checkoutSpies.startCheckout.mockResolvedValue(null);
    checkoutSpies.updateSubscription.mockResolvedValue(true);
    checkoutSpies.scheduleCancelToFree.mockResolvedValue(true);
    hookState.demoCount = 0;
    hookState.demoMaxItems = 0;
    hookState.aiUsed = 0;
    plansState.catalogOverride = null;
    plansState.billingKind = 'paid_active';
    plansState.current = plansState.proPlan;
    plansState.subscription = {
      id: 's1',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_1',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    vi.stubGlobal('location', { ...window.location, reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders plan cards when catalog is ready', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Choose a plan' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
  });

  it('renders $0 price headline for the Free plan card (not US$0)', () => {
    plansState.current = plansState.freePlan;
    plansState.subscription = null;
    renderPage();
    const freeCard = document.getElementById('plan-card-beakerstack_free');
    expect(freeCard).not.toBeNull();
    expect(within(freeCard as HTMLElement).getByText('$0')).toBeInTheDocument();
    expect(
      within(freeCard as HTMLElement).queryByText('US$0')
    ).not.toBeInTheDocument();
  });

  it('shows Free as current plan when subscription is null', () => {
    plansState.current = plansState.freePlan;
    plansState.subscription = null;

    renderPage();

    expect(
      screen.getByRole('button', { name: 'Current plan' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start 5-day free trial' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Upgrade to Pro' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Switch to/i })
    ).not.toBeInTheDocument();
  });

  it('shows Free as current plan on annual toggle without Stripe subscription', () => {
    plansState.current = plansState.freePlan;
    plansState.subscription = null;

    renderPage('/billing/plans?cadence=annual');

    expect(
      screen.getByRole('button', { name: 'Current plan' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Switch to annual/i })
    ).not.toBeInTheDocument();
  });

  it('shows Free as current plan when subscription exists but has no Stripe price', () => {
    plansState.current = plansState.freePlan;
    plansState.subscription = {
      id: 's_free',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_free',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      status: 'free',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };

    renderPage('/billing/plans?cadence=annual');

    expect(
      screen.getByRole('button', { name: 'Current plan' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Switch to/i })
    ).not.toBeInTheDocument();
  });

  it('keeps cadence switch CTA for paid current plan when cadence differs', () => {
    plansState.current = {
      ...plansState.proPlan,
      stripe_price_id_monthly: 'price_pro_monthly',
      stripe_price_id_annual: 'price_pro_annual',
    };
    plansState.subscription = {
      id: 's_paid',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus_paid',
      stripe_subscription_id: 'sub_paid',
      stripe_price_id: 'price_pro_monthly',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };

    renderPage('/billing/plans?cadence=annual');

    expect(
      screen.getByRole('button', { name: 'Switch to annual' })
    ).toBeInTheDocument();
  });

  it('reloads the page after cadence switch when updateSubscription returns success', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });

    plansState.current = {
      ...plansState.proPlan,
      stripe_price_id_monthly: 'price_pro_monthly',
      stripe_price_id_annual: 'price_pro_annual',
    };
    plansState.subscription = {
      id: 's_paid',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus_paid',
      stripe_subscription_id: 'sub_paid',
      stripe_price_id: 'price_pro_monthly',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    checkoutSpies.updateSubscription.mockResolvedValue(true);

    renderPage('/billing/plans?cadence=annual');

    await user.click(screen.getByRole('button', { name: 'Switch to annual' }));

    await waitFor(() => {
      expect(checkoutSpies.updateSubscription).toHaveBeenCalledWith(
        'beakerstack_pro',
        'annual'
      );
    });
    expect(reload).toHaveBeenCalled();
  });

  it('does not reload when cadence switch returns no success flag', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });

    plansState.current = {
      ...plansState.proPlan,
      stripe_price_id_monthly: 'price_pro_monthly',
      stripe_price_id_annual: 'price_pro_annual',
    };
    plansState.subscription = {
      id: 's_paid',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus_paid',
      stripe_subscription_id: 'sub_paid',
      stripe_price_id: 'price_pro_monthly',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    checkoutSpies.updateSubscription.mockResolvedValue(false);

    renderPage('/billing/plans?cadence=annual');

    await user.click(screen.getByRole('button', { name: 'Switch to annual' }));

    await waitFor(() => {
      expect(checkoutSpies.updateSubscription).toHaveBeenCalledWith(
        'beakerstack_pro',
        'annual'
      );
    });
    expect(reload).not.toHaveBeenCalled();
  });

  it('shows disabled Current plan on paid tier when toggle cadence matches subscription cadence', () => {
    plansState.current = {
      ...plansState.proPlan,
      stripe_price_id_monthly: 'price_pro_monthly',
      stripe_price_id_annual: 'price_pro_annual',
    };
    plansState.subscription = {
      id: 's_paid',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus_paid',
      stripe_subscription_id: 'sub_paid',
      stripe_price_id: 'price_pro_monthly',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };

    renderPage('/billing/plans');

    const proSection = document.getElementById('plan-card-beakerstack_pro');
    expect(proSection).toBeTruthy();
    expect(
      within(proSection as HTMLElement).getByRole('button', {
        name: 'Current plan',
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Switch to annual/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Switch to monthly/i })
    ).not.toBeInTheDocument();
  });

  it('uses fallback Current plan CTA when paid tiers tie on display_order but ids differ', () => {
    plansState.current = {
      ...plansState.proPlan,
      stripe_price_id_monthly: 'price_pro_monthly',
      stripe_price_id_annual: 'price_pro_annual',
    };
    plansState.subscription = {
      id: 's_paid',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus_paid',
      stripe_subscription_id: 'sub_paid',
      stripe_price_id: 'price_pro_monthly',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };

    renderPage('/billing/plans');

    const twinSection = document.getElementById(
      'plan-card-beakerstack_pro_twin'
    );
    expect(twinSection).toBeTruthy();
    const cta = within(twinSection as HTMLElement).getByRole('button', {
      name: 'Current plan',
    });
    expect(cta).toBeDisabled();
  });

  it('shows Scheduled on target plan when downgrade is pending', () => {
    plansState.billingKind = 'downgrade_pending';
    plansState.subscription = {
      id: 's1',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_1',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: true,
      pending_target_plan_id: 'beakerstack_free',
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    renderPage();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('shows catalog loading placeholder', () => {
    plansState.catLoading = true;
    renderPage();
    expect(screen.getByText(/Loading plans/i)).toBeInTheDocument();
  });

  it('assigns checkout URL when upgrading from Free', async () => {
    const user = userEvent.setup();
    const hrefSpy = vi
      .spyOn(window.location, 'href', 'set')
      .mockImplementation(() => {});
    plansState.current = plansState.freePlan;
    plansState.subscription = null;
    checkoutSpies.startCheckout.mockResolvedValue({
      checkoutUrl: 'https://checkout.example/session',
    });
    renderPage();
    await user.click(screen.getByRole('button', { name: /^Upgrade to Pro$/i }));
    await waitFor(() => {
      expect(hrefSpy).toHaveBeenCalledWith('https://checkout.example/session');
    });
    hrefSpy.mockRestore();
  });

  it('calls updateSubscription when upgrading to a higher paid plan', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Upgrade to Max/i }));
    await waitFor(() => {
      expect(checkoutSpies.updateSubscription).toHaveBeenCalledWith(
        'beakerstack_max',
        'monthly'
      );
    });
  });

  it('calls updateSubscription when downgrading from Max to Pro', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    plansState.current = plansState.maxPlan;
    plansState.subscription = {
      id: 's_max',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_max',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_max',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    renderPage();
    await user.click(
      screen.getByRole('button', { name: /^Downgrade to Pro$/i })
    );
    await waitFor(() => {
      expect(checkoutSpies.updateSubscription).toHaveBeenCalledWith(
        'beakerstack_pro',
        'monthly'
      );
    });
    expect(reload).toHaveBeenCalled();
  });

  it('confirms downgrade to Free via modal', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    plansState.current = plansState.proPlan;
    plansState.subscription = {
      id: 's1',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_1',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    renderPage();
    await user.click(
      screen.getByRole('button', { name: /Downgrade to Free/i })
    );
    await user.click(
      screen.getByRole('button', { name: /Confirm downgrade/i })
    );
    await waitFor(() => {
      expect(checkoutSpies.scheduleCancelToFree).toHaveBeenCalled();
    });
    expect(reload).toHaveBeenCalled();
  });

  it('renders disabled plan CTAs when current plan is not yet loaded', () => {
    plansState.currentNull = true;
    renderPage();
    const dots = screen.getAllByRole('button', { name: '…' });
    expect(dots.length).toBeGreaterThan(0);
    expect(dots[0]).toBeDisabled();
  });

  it('exposes plan-card-{id} anchors for scroll targeting', () => {
    renderPage();
    expect(document.getElementById('plan-card-beakerstack_pro')).toBeTruthy();
    expect(document.getElementById('plan-card-beakerstack_max')).toBeTruthy();
  });

  it('shows post-signup funnel banner when welcome=1 and plan is in catalog', async () => {
    renderPage('/billing/plans?plan=beakerstack_pro&welcome=1');
    expect(
      await screen.findByText(/You.*re almost there/i)
    ).toBeInTheDocument();
  });

  it('welcome banner copy reflects annual cadence when selected', async () => {
    renderPage('/billing/plans?plan=beakerstack_pro&welcome=1&cadence=annual');
    expect(
      await screen.findByText(/Annual billing is selected below/i)
    ).toBeInTheDocument();
  });

  it('coerces null demo counts and AI usage to zero when computing blockers', () => {
    hookState.demoCount = null;
    hookState.demoMaxItems = null;
    hookState.aiUsed = null;
    plansState.current = plansState.maxPlan;
    plansState.subscription = {
      id: 's_max',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_max',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_max',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    renderPage();
    expect(
      screen.getByRole('button', { name: 'Downgrade to Pro' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Downgrade to Free/i })
    ).toBeInTheDocument();
  });

  it('treats missing display_order as 0 when comparing plans', () => {
    const noOrderCurrent: Plan = {
      ...plansState.proPlan,
      display_order: undefined as unknown as number,
    };
    const noOrderHigher: Plan = {
      ...plansState.maxPlan,
      display_order: undefined as unknown as number,
    };
    plansState.current = noOrderCurrent;
    plansState.catalogOverride = [
      plansState.freePlan,
      noOrderCurrent,
      noOrderHigher,
    ];
    plansState.subscription = {
      id: 's_paid',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_paid',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Choose a plan' })
    ).toBeInTheDocument();
  });

  it('shows raw upgrade label when trial_period_days is unset', () => {
    const noTrialMax: Plan = {
      ...plansState.maxPlan,
      trial_period_days: undefined as unknown as number,
    };
    plansState.current = plansState.freePlan;
    plansState.subscription = null;
    plansState.catalogOverride = [
      plansState.freePlan,
      plansState.proPlan,
      noTrialMax,
    ];
    renderPage();
    expect(
      screen.getByRole('button', { name: 'Upgrade to Max' })
    ).toBeInTheDocument();
  });

  it('closes the downgrade modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    plansState.current = plansState.proPlan;
    plansState.subscription = {
      id: 's_paid',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_paid',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    renderPage();
    await user.click(
      screen.getByRole('button', { name: /Downgrade to Free/i })
    );
    expect(
      screen.getByRole('button', { name: /Confirm downgrade/i })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(
      screen.queryByRole('button', { name: /Confirm downgrade/i })
    ).not.toBeInTheDocument();
    expect(checkoutSpies.scheduleCancelToFree).not.toHaveBeenCalled();
  });

  it('does not reload when downgrade modal confirm resolves false', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    checkoutSpies.scheduleCancelToFree.mockResolvedValue(false);
    plansState.current = plansState.proPlan;
    plansState.subscription = {
      id: 's_paid',
      user_id: 'u1',
      product_id: 'beakerstack',
      plan_id: 'beakerstack_pro',
      stripe_customer_id: 'cus',
      stripe_subscription_id: 'sub_paid',
      stripe_price_id: 'price',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
    };
    renderPage();
    await user.click(
      screen.getByRole('button', { name: /Downgrade to Free/i })
    );
    await user.click(
      screen.getByRole('button', { name: /Confirm downgrade/i })
    );
    await waitFor(() => {
      expect(checkoutSpies.scheduleCancelToFree).toHaveBeenCalled();
    });
    expect(reload).not.toHaveBeenCalled();
  });
});

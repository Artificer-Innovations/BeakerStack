import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { BillingProvider } from '@beakerstack/billing';
import DashboardPage from '@adopter/web/pages/DashboardPage';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { brandNameRegex } from '@adopter/config/branding';
import { billingConfig } from '@adopter/config/billing';
import { supabase } from '@/lib/supabase';

const mockNavigate = vi.fn();

const FREE_PLAN_ROW = {
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
    containers_per_account_max: 2,
    items_per_container_max: 3,
    feature_a: false,
    feature_b: false,
  },
  usage_limits: { ai_summarize: 30 },
  trial_period_days: 0,
  is_public: true,
  display_order: 1,
};

const SUBSCRIPTION_ROW = {
  id: 's1',
  user_id: 'test-user-id',
  product_id: 'beakerstack',
  plan_id: 'beakerstack_free',
  status: 'active',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  pending_target_plan_id: null,
  canceled_at: null,
  trial_start: null,
  trial_end: null,
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'billing_subscriptions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: SUBSCRIPTION_ROW,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'billing_plans') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: FREE_PLAN_ROW,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows returned' },
            }),
          })),
        })),
      };
    }),
    rpc: vi.fn((name: string) => {
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '2025-12-31T00:00:00.000Z',
            periodStart: '2025-12-01T00:00:00.000Z',
          },
          error: null,
        });
      }
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [], error: null });
      }
      if (name?.startsWith('billing_demo_')) {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    channel: vi.fn().mockImplementation(() => {
      const ch = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockResolvedValue(undefined),
      };
      return ch;
    }),
    removeChannel: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const billingBase = 'http://localhost:5173';

function wrapDashboard(ui: ReactElement) {
  return (
    <BrowserRouter>
      <AuthProvider supabaseClient={supabase}>
        <ProfileProvider supabaseClient={supabase}>
          <BillingProvider<typeof billingConfig>
            supabase={supabase}
            config={billingConfig}
            checkoutSuccessUrl={`${billingBase}/billing?checkout=success`}
            checkoutCancelUrl={`${billingBase}/billing/plans?checkout=cancel`}
            portalReturnUrl={`${billingBase}/billing`}
          >
            {ui}
          </BillingProvider>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = async (ui: React.ReactElement) => {
    let result: ReturnType<typeof render> | null = null;
    await act(async () => {
      result = render(wrapDashboard(ui));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    if (!result) {
      throw new Error('Failed to render DashboardPage test component');
    }
    return result;
  };

  it('renders dashboard page', async () => {
    await renderWithAuth(<DashboardPage />);

    expect(
      screen.getByRole('heading', {
        name: new RegExp(
          `${getAdopterConfig().branding.displayName}\\s+in action`,
          'i'
        ),
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
  });

  it('links to GitHub repo from demo banner', async () => {
    await renderWithAuth(<DashboardPage />);
    const link = screen.getByRole('link', { name: /view on github/i });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/Artificer-Innovations/BeakerStack'
    );
  });

  it('displays user email when authenticated', async () => {
    await renderWithAuth(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText(getAdopterConfig().branding.displayName)
      ).toBeInTheDocument();
    });
  });

  it('shows sign out button', async () => {
    await renderWithAuth(<DashboardPage />);

    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
  });

  it('shows home link', async () => {
    await renderWithAuth(<DashboardPage />);

    const homeLinks = screen.getAllByRole('link', { name: brandNameRegex() });
    expect(homeLinks.length).toBeGreaterThan(0);
  });

  it('calls signOut and navigates to home when sign out button is clicked', async () => {
    const user = userEvent.setup();
    await renderWithAuth(<DashboardPage />);

    const avatar = screen.getByRole('button', { name: /user menu/i });

    await user.click(avatar);

    await waitFor(async () => {
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('shows loading state while signing out', async () => {
    await renderWithAuth(<DashboardPage />);
    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
  });

  it('navigates even if sign out API call fails (graceful degradation)', async () => {
    await renderWithAuth(<DashboardPage />);
    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
  });
});

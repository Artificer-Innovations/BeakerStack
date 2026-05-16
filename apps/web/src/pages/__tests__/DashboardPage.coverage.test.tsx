// Coverage-targeted tests for DashboardPage.tsx:
//   - Lines 19-25: appendActivity functional updater body (setActivityLog)
//   - Lines 48-54: useEffect branches when collections is non-empty

import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { BillingProvider } from '@beakerstack/billing';
import DashboardPage from '../DashboardPage';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { BRANDING } from '@beakerstack/shared/config/branding';
import { beakerstackBillingConfig } from '@/billing/beakerstackBillingConfig';

// vi.mock is hoisted to top of file, so supabaseMock must be defined via vi.hoisted()
// to avoid "Cannot access before initialization" TDZ errors.
const { supabaseMock, mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const supabaseMock = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
    rpc: mockRpc,
    channel: vi.fn(),
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn() },
  };
  return { supabaseMock, mockRpc };
});

// supabaseRpc is an alias for supabase in production; mock it the same way
// so useDemoCollections can call supabaseRpc.rpc(...)
vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
  supabaseRpc: supabaseMock,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

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

// collectionsData is mutated per-test to control what billing_demo_get_collections returns
let collectionsData: Array<{ id: string; item_count: number }> = [];

const billingBase = 'http://localhost:5173';

function wrapDashboard(ui: ReactElement) {
  return (
    <BrowserRouter>
      <AuthProvider supabaseClient={supabaseMock as never}>
        <ProfileProvider supabaseClient={supabaseMock as never}>
          <BillingProvider<typeof beakerstackBillingConfig>
            supabase={supabaseMock as never}
            config={beakerstackBillingConfig}
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

describe('DashboardPage (coverage)', () => {
  beforeEach(() => {
    collectionsData = [];
    vi.clearAllMocks();

    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: { user: { id: 'test-user-id', email: 'test@example.com' } },
      },
    });
    supabaseMock.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'billing_subscriptions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: SUBSCRIPTION_ROW, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'billing_plans') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: FREE_PLAN_ROW, error: null }),
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
    });

    mockRpc.mockImplementation((name: string) => {
      if (name === 'ensure_billing_subscription')
        return Promise.resolve({ data: null, error: null });
      if (name === 'billing_get_remaining_usage')
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
      if (name === 'billing_record_usage_event')
        return Promise.resolve({ data: null, error: null });
      if (name === 'billing_demo_get_collections')
        return Promise.resolve({ data: collectionsData, error: null });
      if (name?.startsWith('billing_demo_'))
        return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    supabaseMock.channel.mockImplementation(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    }));
    supabaseMock.removeChannel.mockResolvedValue({ status: 'ok', error: null });
    supabaseMock.functions.invoke.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('useEffect auto-selects first collection when collections load with selectedId null (lines 48-50)', async () => {
    // Return a collection so the useEffect branch at line 48 runs:
    // if (selectedCollectionId === null) setSelectedCollectionId(collections[0].id)
    collectionsData = [{ id: 'cov-col-1', item_count: 0 }];
    await act(async () => {
      render(wrapDashboard(<DashboardPage />));
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: new RegExp(`${BRANDING.displayName}\\s+in action`, 'i'),
        })
      ).toBeInTheDocument();
    });
    // Collections loaded; the first collection should now be auto-selected.
    expect(mockRpc).toHaveBeenCalledWith(
      'billing_demo_get_collections',
      expect.any(Object)
    );
  });

  it('appendActivity functional updater runs when a collection operation fires onActivity (lines 19-25)', async () => {
    // With empty collections, "New Collection" button is enabled.
    // Clicking it calls addCollection → on success CollectionsGrid fires onActivity
    // → appendActivity runs the setActivityLog functional updater (lines 19-25).
    const user = userEvent.setup();
    await act(async () => {
      render(wrapDashboard(<DashboardPage />));
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    const addBtn = await screen.findByRole('button', {
      name: /new collection/i,
    });
    await user.click(addBtn);
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        'billing_demo_add_collection',
        expect.any(Object)
      );
    });
  });
});

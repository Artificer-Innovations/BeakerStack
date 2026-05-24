import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@mobile/lib/supabase';
import DashboardScreen from '../DashboardScreen';

type DashboardScreenNavigationProp = React.ComponentProps<
  typeof DashboardScreen
>['navigation'];

jest.mock('@beakerstack/billing', () => {
  return {
    defineBillingConfig: (c: unknown) => c,
    BillingProvider: ({ children }: { children: React.ReactNode }) => children,
    mapUnknownError: (e: unknown) => ({
      kind: 'unknown' as const,
      message: e instanceof Error ? e.message : String(e),
    }),
    useBillingContext: () => ({
      refreshSubscription: jest.fn().mockResolvedValue(undefined),
      config: { productId: 'beakerstack' },
    }),
    useFeature: jest.fn(() => ({
      enabled: true,
      value: 2,
      loading: false,
      error: null,
    })),
    usePlan: jest.fn(() => ({
      data: { id: 'beakerstack_free', display_name: 'Free' },
      loading: false,
      error: null,
    })),
    useUsage: jest.fn(() => ({
      used: 0,
      limit: 30,
      remaining: 30,
      resetsAt: '',
      exceeded: false,
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

jest.mock('@beakerstack/billing/native', () => {
  const { Text } = require('react-native');
  return {
    FeatureGate: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    UsageIndicator: () => <Text>usage</Text>,
  };
});

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
}));

jest.mock('@beakerstack/shared/components/navigation/AppHeader.native', () => ({
  AppHeader: () => null,
}));

jest.mock('@mobile/lib/supabase', () => {
  const mockRpc = jest.fn((name: string) => {
    if (name === 'billing_record_usage_event') {
      return Promise.resolve({ data: null, error: null });
    }
    if (name === 'billing_demo_get_collections') {
      return Promise.resolve({ data: [], error: null });
    }
    if (name === 'ensure_billing_subscription') {
      return Promise.resolve({ data: null, error: null });
    }
    if (name === 'billing_get_remaining_usage') {
      return Promise.resolve({
        data: {
          used: 0,
          limit: 30,
          remaining: 30,
          periodEnd: '',
          periodStart: '',
        },
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
  };
  return {
    supabase: {
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        })),
        signOut: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            })),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
      rpc: mockRpc,
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
      functions: {
        invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
  };
});

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser,
};

const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  navigate: mockNavigate,
} as unknown as DashboardScreenNavigationProp;

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider supabaseClient={supabase as SupabaseClient}>
      <ProfileProvider supabaseClient={supabase as SupabaseClient}>
        {component}
      </ProfileProvider>
    </AuthProvider>
  );
};

function restoreDefaultSupabaseRpc(): void {
  (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
    if (name === 'billing_record_usage_event') {
      return Promise.resolve({ data: null, error: null });
    }
    if (name === 'billing_demo_get_collections') {
      return Promise.resolve({ data: [], error: null });
    }
    if (name === 'billing_demo_simulate_upgrade') {
      return Promise.resolve({ data: null, error: null });
    }
    if (name === 'billing_demo_reset_usage') {
      return Promise.resolve({ data: null, error: null });
    }
    if (name === 'ensure_billing_subscription') {
      return Promise.resolve({ data: null, error: null });
    }
    if (name === 'billing_get_remaining_usage') {
      return Promise.resolve({
        data: {
          used: 0,
          limit: 30,
          remaining: 30,
          periodEnd: '',
          periodStart: '',
        },
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

function restoreBillingFeatureMocks(): void {
  const billing = jest.requireMock('@beakerstack/billing') as {
    useUsage: jest.Mock;
    useFeature: jest.Mock;
  };
  billing.useFeature.mockImplementation(() => ({
    enabled: true,
    value: 2,
    loading: false,
    error: null,
  }));
  billing.useUsage.mockImplementation(() => ({
    used: 0,
    limit: 30,
    remaining: 30,
    resetsAt: '',
    exceeded: false,
    loading: false,
    error: null,
    refresh: jest.fn().mockResolvedValue(undefined),
  }));
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    restoreDefaultSupabaseRpc();
    (supabase.functions.invoke as jest.Mock).mockReset();
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    restoreBillingFeatureMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (typeof process !== 'undefined' && process.env) {
      process.env.EXPO_PUBLIC_BILLING_DEMO_MODE = '';
      process.env.EXPO_PUBLIC_DEMO_USE_REAL_AI = '';
    }
  });

  it('shows loading state while checking authentication', () => {
    (supabase.auth.getSession as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(
            () => resolve({ data: { session: null }, error: null }),
            100
          );
        })
    );

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('redirects to Home when not authenticated', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Redirecting...')).toBeTruthy();
    });

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Home');
    });
  });

  it('renders dashboard content when authenticated', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Simulate AI summarize')).toBeTruthy();
      expect(getByText('Boolean feature gates')).toBeTruthy();
    });
  });

  it('records metered usage and shows fake AI summary when Simulate AI summarize is pressed', async () => {
    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Simulate AI summarize')).toBeTruthy();
    });
    fireEvent.press(getByText('Simulate AI summarize'));

    await waitFor(() => {
      expect(getByText(/Lorem ipsum/i)).toBeTruthy();
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'billing_record_usage_event',
      expect.objectContaining({
        p_product_id: 'beakerstack',
        p_quantity: 1,
        p_idempotency_key: expect.any(String),
      })
    );
  });

  it('shows limit reached when meter usage is exceeded', async () => {
    const billing = jest.requireMock('@beakerstack/billing') as {
      useUsage: jest.Mock;
    };
    billing.useUsage.mockImplementation(() => ({
      used: 30,
      limit: 30,
      remaining: 0,
      resetsAt: '',
      exceeded: true,
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    }));

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Limit reached')).toBeTruthy();
      expect(getByText(/Monthly limit reached for this meter/i)).toBeTruthy();
    });
  });

  it('adds a demo collection when Add collection is pressed', async () => {
    const demoRows: { id: string; item_count: number }[] = [];
    (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [...demoRows], error: null });
      }
      if (name === 'billing_demo_add_collection') {
        demoRows.push({ id: 'new-col', item_count: 0 });
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '',
            periodStart: '',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('+ New collection')).toBeTruthy();
    });
    fireEvent.press(getByText('+ New collection'));

    await waitFor(() => {
      expect(getByText(/1 of 2/)).toBeTruthy();
    });
  });

  it('shows record error when billing_record_usage_event returns an error', async () => {
    (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({
          data: null,
          error: { message: 'Usage denied' },
        });
      }
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '',
            periodStart: '',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Simulate AI summarize')).toBeTruthy();
    });
    fireEvent.press(getByText('Simulate AI summarize'));

    await waitFor(() => {
      // mapUnknownError mock stringifies non-Error throws
      expect(getByText(/\[object Object\]|Usage denied/i)).toBeTruthy();
    });
  });

  it('uses edge function summary when EXPO_PUBLIC_DEMO_USE_REAL_AI is true', async () => {
    process.env.EXPO_PUBLIC_DEMO_USE_REAL_AI = 'true';
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { text: '  Edge summary line  ' },
      error: null,
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Simulate AI summarize')).toBeTruthy();
    });
    fireEvent.press(getByText('Simulate AI summarize'));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'demo-ai-summarize',
        expect.objectContaining({
          body: expect.objectContaining({
            prompt: expect.any(String),
          }),
        })
      );
      expect(getByText('Edge summary line')).toBeTruthy();
    });
  });

  it('falls back to fake AI when edge function returns empty text', async () => {
    process.env.EXPO_PUBLIC_DEMO_USE_REAL_AI = 'true';
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { text: '   ' },
      error: null,
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Simulate AI summarize')).toBeTruthy();
    });
    fireEvent.press(getByText('Simulate AI summarize'));

    await waitFor(() => {
      expect(
        getByText(/Lorem ipsum|Maecenas ligula|Duis semper/i)
      ).toBeTruthy();
    });
  });

  it('renders demo controls and completes plan simulate + reset usage', async () => {
    process.env.EXPO_PUBLIC_BILLING_DEMO_MODE = 'true';

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Demo controls')).toBeTruthy();
    });

    fireEvent.press(getByText('To Pro'));

    await waitFor(() => {
      expect(getByText('Done.')).toBeTruthy();
      expect(supabase.rpc).toHaveBeenCalledWith(
        'billing_demo_simulate_upgrade',
        expect.objectContaining({ p_plan_id: 'beakerstack_pro' })
      );
    });

    fireEvent.press(getByText('Reset all usage counters'));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith(
        'billing_demo_reset_usage',
        expect.objectContaining({
          p_event_type: expect.anything(),
        })
      );
    });
  });

  it('shows demo control error when simulate upgrade RPC fails', async () => {
    process.env.EXPO_PUBLIC_BILLING_DEMO_MODE = 'true';
    (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
      if (name === 'billing_demo_simulate_upgrade') {
        return Promise.resolve({
          data: null,
          error: { message: 'Simulate failed' },
        });
      }
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'billing_demo_reset_usage') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '',
            periodStart: '',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('To Max')).toBeTruthy();
    });
    fireEvent.press(getByText('To Max'));

    await waitFor(() => {
      // DemoControls `run` catch: non-Error throws become message "Failed"
      expect(getByText('Failed')).toBeTruthy();
    });
  });

  it('shows Action failed when addItem rejects with a non-Error from RPC', async () => {
    const billing = jest.requireMock('@beakerstack/billing') as {
      useFeature: jest.Mock;
    };
    billing.useFeature.mockImplementation((feature: string) => {
      if (feature === 'containers_per_account_max') {
        return { enabled: true, value: 10, loading: false, error: null };
      }
      if (feature === 'items_per_container_max') {
        return { enabled: true, value: 10, loading: false, error: null };
      }
      return { enabled: true, value: 2, loading: false, error: null };
    });

    const rows = [{ id: 'rowadd01', item_count: 0 }];
    (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [...rows], error: null });
      }
      if (name === 'billing_demo_add_item') {
        return Promise.resolve({ data: null, error: { message: 'nope' } });
      }
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_simulate_upgrade') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_reset_usage') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '',
            periodStart: '',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('+ Add item')).toBeTruthy();
    });
    fireEvent.press(getByText('+ Add item'));

    await waitFor(() => {
      expect(getByText('Action failed.')).toBeTruthy();
    });
  });

  it('removes collection after Delete succeeds', async () => {
    const rows = [{ id: 'delcol01', item_count: 0 }];
    (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [...rows], error: null });
      }
      if (name === 'billing_demo_delete_collection') {
        rows.pop();
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_simulate_upgrade') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_reset_usage') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '',
            periodStart: '',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Del')).toBeTruthy();
    });
    fireEvent.press(getByText('Del'));

    await waitFor(() => {
      expect(
        getByText(/No collections yet\. Tap 'New collection' to start\./)
      ).toBeTruthy();
    });
  });

  it('reselects another collection when the selected one is deleted', async () => {
    const rows = [
      { id: 'keepcol1', item_count: 0 },
      { id: 'gonecol2', item_count: 0 },
    ];
    (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [...rows], error: null });
      }
      if (name === 'billing_demo_delete_collection') {
        const idx = rows.findIndex(r => r.id === 'gonecol2');
        if (idx >= 0) rows.splice(idx, 1);
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '',
            periodStart: '',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { getByText, queryByText, getAllByLabelText, getAllByText } =
      renderWithProviders(<DashboardScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('gonecol2…')).toBeTruthy();
    });

    const collectionCards = getAllByText('Collection');
    const lastCollectionCard = collectionCards.at(-1);
    if (!lastCollectionCard) {
      throw new Error('expected at least one collection card');
    }
    fireEvent.press(lastCollectionCard);

    const deleteButtons = getAllByLabelText('Delete collection');
    const lastDeleteButton = deleteButtons.at(-1);
    if (!lastDeleteButton) {
      throw new Error('expected at least one delete button');
    }
    fireEvent.press(lastDeleteButton);

    await waitFor(() => {
      expect(queryByText(/gonecol2/)).toBeNull();
      expect(getByText('keepcol1…')).toBeTruthy();
    });
  });

  it('shows demo control error message when simulate upgrade rejects with Error', async () => {
    process.env.EXPO_PUBLIC_BILLING_DEMO_MODE = 'true';
    (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
      if (name === 'billing_demo_simulate_upgrade') {
        return Promise.reject(new Error('Upgrade boom'));
      }
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'billing_demo_reset_usage') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '',
            periodStart: '',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => expect(getByText('To Pro')).toBeTruthy());
    fireEvent.press(getByText('To Pro'));

    await waitFor(() => expect(getByText('Upgrade boom')).toBeTruthy());
  });

  it('shows Limit on add item when at item cap', async () => {
    const billing = jest.requireMock('@beakerstack/billing') as {
      useFeature: jest.Mock;
    };
    billing.useFeature.mockImplementation((feature: string) => {
      if (feature === 'containers_per_account_max') {
        return { enabled: true, value: 10, loading: false, error: null };
      }
      if (feature === 'items_per_container_max') {
        return { enabled: true, value: 2, loading: false, error: null };
      }
      return { enabled: true, value: 2, loading: false, error: null };
    });

    const rows = [{ id: 'capitems', item_count: 2 }];
    (supabase.rpc as jest.Mock).mockImplementation((name: string) => {
      if (name === 'billing_demo_get_collections') {
        return Promise.resolve({ data: [...rows], error: null });
      }
      if (name === 'billing_record_usage_event') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_simulate_upgrade') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_demo_reset_usage') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'ensure_billing_subscription') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'billing_get_remaining_usage') {
        return Promise.resolve({
          data: {
            used: 0,
            limit: 30,
            remaining: 30,
            periodEnd: '',
            periodStart: '',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Item limit reached')).toBeTruthy();
    });
  });
});

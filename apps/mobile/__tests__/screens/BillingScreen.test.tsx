import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import BillingScreen from '../../src/screens/BillingScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual<typeof import('@react-navigation/native')>(
    '@react-navigation/native'
  );
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('@beakerstack/billing', () => ({
  defineBillingConfig: (c: unknown) => c,
  BillingProvider: ({ children }: { children: React.ReactNode }) => children,
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
  useRecordUsage: jest.fn(() => ({
    record: jest.fn().mockResolvedValue(undefined),
    pending: false,
  })),
}));

jest.mock('@beakerstack/billing/native', () => {
  const { Text } = require('react-native');
  return {
    CustomerPortalLink: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    FeatureGate: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    PricingTable: () => <Text>pricing</Text>,
    SubscriptionStatus: () => <Text>status</Text>,
    UpgradePrompt: ({ reason }: { reason: string }) => <Text>{reason}</Text>,
    UsageIndicator: () => <Text>usage</Text>,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
  };
});

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

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

function restoreBillingMocks(): void {
  const billing = jest.requireMock('@beakerstack/billing') as {
    useUsage: jest.Mock;
    useRecordUsage: jest.Mock;
  };
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
  billing.useRecordUsage.mockImplementation(() => ({
    record: jest.fn().mockResolvedValue(undefined),
    pending: false,
  }));
}

describe('BillingScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    restoreBillingMocks();
    (
      jest.requireMock('../../src/lib/supabase').supabase.rpc as jest.Mock
    ).mockReset();
    (
      jest.requireMock('../../src/lib/supabase').supabase.rpc as jest.Mock
    ).mockResolvedValue({ data: null, error: null });
    if (typeof process !== 'undefined' && process.env) {
      process.env.EXPO_PUBLIC_BILLING_DEMO_MODE = '';
    }
  });

  const renderScreen = () =>
    render(
      <NavigationContainer>
        <BillingScreen />
      </NavigationContainer>
    );

  it('renders billing title, subtitle, and non-demo hint', () => {
    const { getByText } = renderScreen();

    expect(getByText('Billing')).toBeTruthy();
    expect(getByText(/For the full \/billing experience/i)).toBeTruthy();
    expect(getByText(/Set EXPO_PUBLIC_BILLING_DEMO_MODE=true/i)).toBeTruthy();
    expect(getByText('Subscription')).toBeTruthy();
    expect(getByText('AI summarize (metered)')).toBeTruthy();
    expect(getByText('Use one summarize')).toBeTruthy();
    expect(getByText('Feature B (Max)')).toBeTruthy();
    expect(getByText('Feature B enabled')).toBeTruthy();
  });

  it('calls navigation.goBack when Back is pressed', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('← Back'));

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('shows UpgradePrompt when meter is exceeded', () => {
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

    const { getByText } = renderScreen();
    expect(getByText('Monthly limit reached.')).toBeTruthy();
  });

  it('shows pending ellipsis on metered button and disables press', () => {
    const billing = jest.requireMock('@beakerstack/billing') as {
      useRecordUsage: jest.Mock;
    };
    billing.useRecordUsage.mockImplementation(() => ({
      record: jest.fn().mockResolvedValue(undefined),
      pending: true,
    }));

    const { getByText } = renderScreen();
    expect(getByText('…')).toBeTruthy();
  });

  it('invokes record and refresh from metered block', async () => {
    const billing = jest.requireMock('@beakerstack/billing') as {
      useRecordUsage: jest.Mock;
      useUsage: jest.Mock;
    };
    const record = jest.fn().mockResolvedValue(undefined);
    const refresh = jest.fn().mockResolvedValue(undefined);
    billing.useRecordUsage.mockImplementation(() => ({
      record,
      pending: false,
    }));
    billing.useUsage.mockImplementation(() => ({
      used: 0,
      limit: 30,
      remaining: 30,
      resetsAt: '',
      exceeded: false,
      loading: false,
      error: null,
      refresh,
    }));

    const { getByText } = renderScreen();

    fireEvent.press(getByText('Use one summarize'));
    fireEvent.press(getByText('Refresh usage'));

    await waitFor(() => {
      expect(record).toHaveBeenCalledWith(1);
      expect(refresh).toHaveBeenCalled();
    });
  });

  it('shows demo controls and success message when Simulate Pro succeeds', async () => {
    process.env.EXPO_PUBLIC_BILLING_DEMO_MODE = 'true';
    const { supabase } = jest.requireMock('../../src/lib/supabase') as {
      supabase: { rpc: jest.Mock };
    };
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { getByText } = renderScreen();

    expect(getByText('Demo mode — not real billing')).toBeTruthy();
    fireEvent.press(getByText('Simulate Pro'));

    await waitFor(() => {
      expect(getByText(/Simulated beakerstack_pro/i)).toBeTruthy();
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'billing_demo_simulate_upgrade',
      expect.objectContaining({
        p_product_id: 'beakerstack',
        p_plan_id: 'beakerstack_pro',
      })
    );
  });

  it('shows RPC error message from demo simulate upgrade', async () => {
    process.env.EXPO_PUBLIC_BILLING_DEMO_MODE = 'true';
    const { supabase } = jest.requireMock('../../src/lib/supabase') as {
      supabase: { rpc: jest.Mock };
    };
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Upgrade blocked' },
    });

    const { getByText } = renderScreen();
    fireEvent.press(getByText('Simulate Pro'));

    await waitFor(() => {
      expect(getByText('Upgrade blocked')).toBeTruthy();
    });
  });
});

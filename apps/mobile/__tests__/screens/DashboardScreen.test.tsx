import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../../src/screens/DashboardScreen';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DASHBOARD_TITLE, DASHBOARD_SUBTITLE } from '@shared/utils/strings';

// Mock expo-constants
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

// Mock supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {} as SupabaseClient,
}));

// Mock AppHeader
jest.mock('@shared/components/navigation/AppHeader.native', () => ({
  AppHeader: () => null,
}));

const mockReplace = jest.fn();
const mockNavigation = {
  replace: mockReplace,
} as any;

const createMockSupabaseClient = (hasUser = false): SupabaseClient => {
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

  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: hasUser ? mockSession : null },
        error: null,
      }),
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
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => ({
        unsubscribe: jest.fn(),
      })),
    })),
  } as unknown as SupabaseClient;
};

const renderWithProviders = (
  component: React.ReactElement,
  mockClient?: SupabaseClient
) => {
  const client = mockClient || createMockSupabaseClient();
  return render(
    <AuthProvider supabaseClient={client}>
      <ProfileProvider supabaseClient={client}>{component}</ProfileProvider>
    </AuthProvider>
  );
};

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows loading state while checking authentication', () => {
    const mockClient = createMockSupabaseClient();
    (mockClient.auth.getSession as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(
            () => resolve({ data: { session: null }, error: null }),
            100
          );
        })
    );

    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />,
      mockClient
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('redirects to Home when not authenticated', async () => {
    const mockClient = createMockSupabaseClient(false);
    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />,
      mockClient
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
    const mockClient = createMockSupabaseClient(true);
    const { getByText } = renderWithProviders(
      <DashboardScreen navigation={mockNavigation} />,
      mockClient
    );

    await waitFor(() => {
      expect(getByText(DASHBOARD_TITLE)).toBeTruthy();
      expect(getByText(DASHBOARD_SUBTITLE)).toBeTruthy();
    });
  });
});

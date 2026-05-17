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

// Mock the supabase client import
jest.mock('../../src/lib/supabase', () => {
  const mockSingle = jest.fn().mockResolvedValue({
    data: null,
    error: null,
  });

  const mockEq = jest.fn(() => ({
    single: mockSingle,
  }));

  const mockSelect = jest.fn(() => ({
    eq: mockEq,
    limit: jest.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
  }));

  const mockFrom = jest.fn(() => ({
    select: mockSelect,
  }));

  const mockChannel: any = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn((callback: (status: string) => void) => {
      callback('SUBSCRIBED');
      return mockChannel;
    }),
  };

  return {
    supabase: {
      from: mockFrom,
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
    },
  };
});

// Mock navigation
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  reset: mockReset,
} as any;

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../../src/screens/HomeScreen';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HOME_TITLE, HOME_SUBTITLE } from '@beakerstack/shared/utils/strings';

describe('HomeScreen', () => {
  let mockSupabaseClient: Partial<SupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database query with full chain support
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockEq = jest.fn(() => ({
      single: mockSingle,
    }));

    const mockSelect = jest.fn(() => ({
      eq: mockEq,
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }));

    const mockFrom = jest.fn(() => ({
      select: mockSelect,
    }));

    // Mock realtime channel for useProfile hook
    const mockChannel: any = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
        return mockChannel;
      }),
    };

    mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: null,
          },
        }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
    } as any;
  });

  const renderWithAuth = (ui: React.ReactElement, authenticated = false) => {
    if (authenticated) {
      mockSupabaseClient.auth!.getSession = jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
      });
    }

    return render(
      <NavigationContainer>
        <AuthProvider supabaseClient={mockSupabaseClient as SupabaseClient}>
          <ProfileProvider
            supabaseClient={mockSupabaseClient as SupabaseClient}
          >
            {ui}
          </ProfileProvider>
        </AuthProvider>
      </NavigationContainer>
    );
  };

  it('renders home screen with title and subtitle', () => {
    const { getAllByText, getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );

    // Title appears in both header and main content
    const titles = getAllByText(HOME_TITLE);
    expect(titles.length).toBeGreaterThan(0);
    // Check subtitle using the shared string constant
    expect(getByText(HOME_SUBTITLE)).toBeTruthy();
  });

  it('shows sign in button when not authenticated', () => {
    const { getAllByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );

    // Sign In appears in both header and main content
    const signInButtons = getAllByText('Sign In');
    expect(signInButtons.length).toBeGreaterThan(0);
  });

  it('shows sign up button when not authenticated', () => {
    const { getAllByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );

    // Sign Up appears in both header and main content
    const signUpButtons = getAllByText('Sign Up');
    expect(signUpButtons.length).toBeGreaterThan(0);
  });

  it('shows navigation header with sign in and sign up when not authenticated', () => {
    const { getAllByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );

    const signInLinks = getAllByText('Sign In');
    const signUpLinks = getAllByText('Sign Up');
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signUpLinks.length).toBeGreaterThan(0);
  });

  it('navigates to Login and Signup from signed-out buttons', () => {
    const { getAllByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );

    const signIns = getAllByText('Sign In');
    fireEvent.press(signIns[signIns.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith('Login');

    const signUps = getAllByText('Sign Up');
    fireEvent.press(signUps[signUps.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });

  it('resets navigation to Dashboard when authenticated', async () => {
    renderWithAuth(<HomeScreen navigation={mockNavigation} />, true);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    });
  });

  it('shows redirecting indicator when authenticated', async () => {
    const { getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      true
    );

    await waitFor(() => {
      expect(getByText('Redirecting...')).toBeTruthy();
    });
  });
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../src/screens/LoginScreen';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'test-anon-key',
        googleWebClientId: 'test-web-client-id',
        googleIosClientId: 'test-ios-client-id',
        googleAndroidClientId: 'test-android-client-id',
      },
    },
  },
}));

// Mock supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {} as SupabaseClient,
}));

// Mock AppHeader
jest.mock('@beakerstack/shared/components/navigation/AppHeader.native', () => ({
  AppHeader: () => null,
}));

// Mock SocialLoginButton
jest.mock('../../src/components/SocialLoginButton', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    SocialLoginButton: ({ onPress }: { onPress: () => void }) => (
      <Pressable onPress={onPress}>
        <Text>Google Sign In</Text>
      </Pressable>
    ),
  };
});

// Mock featureFlags
jest.mock('../../src/config/featureFlags', () => ({
  useFeatureFlags: () => ({
    oauthGoogle: true,
    showNativeHeader: false,
  }),
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  reset: mockReset,
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
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithIdToken: jest.fn(),
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

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders login form', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <LoginScreen navigation={mockNavigation} />
    );

    expect(getByText('Sign in to your account')).toBeTruthy();
    expect(getByPlaceholderText('Email address')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('shows error when fields are empty', async () => {
    const { getByText } = renderWithProviders(
      <LoginScreen navigation={mockNavigation} />
    );

    const submitButton = getByText('Sign In');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please fill in all fields'
      );
    });
  });

  it('handles successful login', async () => {
    const mockClient = createMockSupabaseClient();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <LoginScreen navigation={mockNavigation} />,
      mockClient
    );

    const emailInput = getByPlaceholderText('Email address');
    const passwordInput = getByPlaceholderText('Password');
    const submitButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Dashboard');
    });
  });

  it('handles login error', async () => {
    const mockClient = createMockSupabaseClient();
    (mockClient.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials', name: 'AuthError', status: 401 },
    });

    const { getByPlaceholderText, getByText } = renderWithProviders(
      <LoginScreen navigation={mockNavigation} />,
      mockClient
    );

    const emailInput = getByPlaceholderText('Email address');
    const passwordInput = getByPlaceholderText('Password');
    const submitButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign In Failed',
        'Invalid credentials'
      );
    });
  });

  it('shows Google Sign In Failed alert when Google sign-in errors', async () => {
    const mockClient = createMockSupabaseClient();
    const { getByText } = renderWithProviders(
      <LoginScreen navigation={mockNavigation} />,
      mockClient
    );

    fireEvent.press(getByText('Google Sign In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const [title, message] = (Alert.alert as jest.Mock).mock.calls[0] as [
        string,
        string,
      ];
      expect(title).toBe('Google Sign In Failed');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  it('redirects to Dashboard if already authenticated', async () => {
    const mockClient = createMockSupabaseClient(true);
    renderWithProviders(
      <LoginScreen navigation={mockNavigation} />,
      mockClient
    );

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    });
  });

  it('navigates to Signup screen', () => {
    const { getByText } = renderWithProviders(
      <LoginScreen navigation={mockNavigation} />
    );

    const signupLink = getByText("Don't have an account? Sign up");
    fireEvent.press(signupLink);

    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });
});

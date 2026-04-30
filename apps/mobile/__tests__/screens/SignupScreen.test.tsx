import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignupScreen from '../../src/screens/SignupScreen';
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

jest.mock('../../src/components/SocialLoginButton', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    SocialLoginButton: ({ onPress }: { onPress: () => void }) => (
      <Pressable onPress={onPress}>
        <Text>Google Sign Up</Text>
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
      signUp: jest.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signInWithPassword: jest.fn(),
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

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders signup form', async () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <SignupScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Create your account')).toBeTruthy();
    });
    expect(getByPlaceholderText('Email address')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm password')).toBeTruthy();
  });

  it('shows error when fields are empty', async () => {
    const { getByText } = renderWithProviders(
      <SignupScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      const submitButton = getByText('Create Account');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please fill in all fields'
      );
    });
  });

  it('shows error when passwords do not match', async () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SignupScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email address');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm password');

    await waitFor(() => {
      const submitButton = getByText('Create Account');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'differentpassword');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Passwords do not match'
      );
    });
  });

  it('handles successful signup', async () => {
    const mockClient = createMockSupabaseClient();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SignupScreen navigation={mockNavigation} />,
      mockClient
    );

    const emailInput = getByPlaceholderText('Email address');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm password');

    await waitFor(() => {
      const submitButton = getByText('Create Account');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(mockClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Dashboard');
    });
  });

  it('handles signup error', async () => {
    const mockClient = createMockSupabaseClient();
    (mockClient.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: 'Email already exists',
        name: 'AuthError',
        status: 400,
      },
    });

    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SignupScreen navigation={mockNavigation} />,
      mockClient
    );

    const emailInput = getByPlaceholderText('Email address');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm password');

    await waitFor(() => {
      const submitButton = getByText('Create Account');

      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign Up Failed',
        'Email already exists'
      );
    });
  });

  it('shows Google Sign Up Failed alert when Google sign-up errors', async () => {
    const mockClient = createMockSupabaseClient();
    const { getByText } = renderWithProviders(
      <SignupScreen navigation={mockNavigation} />,
      mockClient
    );

    fireEvent.press(getByText('Google Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const [title, message] = (Alert.alert as jest.Mock).mock.calls[0] as [
        string,
        string,
      ];
      expect(title).toBe('Google Sign Up Failed');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  it('redirects to Dashboard if already authenticated', async () => {
    const mockClient = createMockSupabaseClient(true);
    renderWithProviders(
      <SignupScreen navigation={mockNavigation} />,
      mockClient
    );

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    });
  });

  it('navigates to Login screen', () => {
    const { getByText } = renderWithProviders(
      <SignupScreen navigation={mockNavigation} />
    );

    const loginLink = getByText('Already have an account? Sign in');
    fireEvent.press(loginLink);

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});

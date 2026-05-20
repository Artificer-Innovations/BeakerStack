import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../src/screens/ForgotPasswordScreen';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';

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

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

jest.mock('@beakerstack/shared/components/navigation/AppHeader.native', () => ({
  AppHeader: () => null,
}));

const mockResetPasswordForEmail = jest.fn();

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, reset: jest.fn() } as any;

const createMockSupabaseClient = (): SupabaseClient =>
  ({
    auth: {
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: jest.fn(),
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
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    })),
    removeChannel: jest.fn().mockResolvedValue(undefined),
  }) as unknown as SupabaseClient;

const renderScreen = () => {
  const client = createMockSupabaseClient();
  return render(
    <AuthProvider supabaseClient={client}>
      <ProfileProvider supabaseClient={client}>
        <ForgotPasswordScreen navigation={mockNavigation} />
      </ProfileProvider>
    </AuthProvider>
  );
};

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the email form', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    expect(getByPlaceholderText('Email address')).toBeTruthy();
    expect(getByText('Send reset link')).toBeTruthy();
  });

  it('shows error when email is empty', async () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Send reset link'));
    await waitFor(() => {
      expect(getByText('Please enter your email address')).toBeTruthy();
    });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('calls requestPasswordReset and shows non-enumerating success message', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const { getByPlaceholderText, getByText, queryByText } = renderScreen();

    fireEvent.changeText(
      getByPlaceholderText('Email address'),
      'user@example.com'
    );
    fireEvent.press(getByText('Send reset link'));

    await waitFor(() => {
      expect(getByText(/If an account exists for/)).toBeTruthy();
    });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({ redirectTo: expect.any(String) })
    );
    expect(queryByText(/account does not exist/i)).toBeNull();
  });

  it('shows error when API fails', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'Network error' },
    });
    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(
      getByPlaceholderText('Email address'),
      'user@example.com'
    );
    fireEvent.press(getByText('Send reset link'));

    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  it('navigates to Login when Back to sign in is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Back to sign in'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});

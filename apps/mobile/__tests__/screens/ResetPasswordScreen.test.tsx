import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ResetPasswordScreen from '../../src/screens/ResetPasswordScreen';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MIN_PASSWORD_LENGTH } from '@beakerstack/shared/constants/auth';

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
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

const mockGetSession = (require('../../src/lib/supabase') as {
  supabase: { auth: { getSession: jest.Mock } };
}).supabase.auth.getSession;

jest.mock('@beakerstack/shared/components/navigation/AppHeader.native', () => ({
  AppHeader: () => null,
}));

const mockUpdateUser = jest.fn();
const mockReset = jest.fn();
const mockNavigation = { reset: mockReset, navigate: jest.fn() } as any;

const mockUser = {
  id: '1',
  email: 'user@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockSession = {
  user: mockUser,
  access_token: 'tok',
  refresh_token: 'ref',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
};

const createMockSupabaseClient = (): SupabaseClient =>
  ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: mockUpdateUser,
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
        <ResetPasswordScreen navigation={mockNavigation} />
      </ProfileProvider>
    </AuthProvider>
  );
};

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows loading state while session check is pending', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));
    const { queryByText } = renderScreen();
    expect(queryByText('Update password')).toBeNull();
  });

  it('resets to ForgotPassword when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    renderScreen();
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'ForgotPassword' }],
      });
    });
  });

  it('renders the form when a session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    const { getByPlaceholderText } = renderScreen();
    await waitFor(() => {
      expect(
        getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`)
      ).toBeTruthy();
    });
    expect(getByPlaceholderText('Confirm new password')).toBeTruthy();
  });

  it('shows alert when password is too short', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    const { getByPlaceholderText, getByText } = renderScreen();

    await waitFor(() =>
      expect(
        getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`)
      ).toBeTruthy()
    );

    fireEvent.changeText(
      getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`),
      'short'
    );
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'short');
    fireEvent.press(getByText('Update password'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Password too short',
        expect.stringContaining(String(MIN_PASSWORD_LENGTH))
      );
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows alert when passwords do not match', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    const { getByPlaceholderText, getByText } = renderScreen();

    await waitFor(() =>
      expect(
        getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`)
      ).toBeTruthy()
    );

    fireEvent.changeText(
      getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`),
      'newpassword1'
    );
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'different123');
    fireEvent.press(getByText('Update password'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('calls updatePassword and navigates to Dashboard on success', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    mockUpdateUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    const { getByPlaceholderText, getByText } = renderScreen();

    await waitFor(() =>
      expect(
        getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`)
      ).toBeTruthy()
    );

    fireEvent.changeText(
      getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`),
      'newpassword1'
    );
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'newpassword1');
    fireEvent.press(getByText('Update password'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    });
  });

  it('shows alert when updatePassword fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    mockUpdateUser.mockRejectedValue(new Error('Password too weak'));
    const { getByPlaceholderText, getByText } = renderScreen();

    await waitFor(() =>
      expect(
        getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`)
      ).toBeTruthy()
    );

    fireEvent.changeText(
      getByPlaceholderText(`New password (min ${MIN_PASSWORD_LENGTH} characters)`),
      'newpassword1'
    );
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'newpassword1');
    fireEvent.press(getByText('Update password'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password too weak');
    });
    expect(mockReset).not.toHaveBeenCalledWith(
      expect.objectContaining({ routes: [{ name: 'Dashboard' }] })
    );
  });
});

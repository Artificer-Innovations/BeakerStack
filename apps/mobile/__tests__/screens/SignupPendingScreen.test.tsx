import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignupPendingScreen from '../../src/screens/SignupPendingScreen';

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
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

jest.mock('@beakerstack/shared/components/navigation/AppHeader.native', () => ({
  AppHeader: () => null,
}));

const mockNavigate = jest.fn();

const mockRoute = {
  key: 'SignupPending-1',
  name: 'SignupPending' as const,
  params: { email: 'pending@example.com' },
};

const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  reset: jest.fn(),
} as any;

describe('SignupPendingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading and email from route params', () => {
    const { getByText } = render(
      <SignupPendingScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Check your email')).toBeTruthy();
    expect(getByText('pending@example.com')).toBeTruthy();
  });

  it('navigates to Login when pressing sign in link', async () => {
    const { getByText } = render(
      <SignupPendingScreen route={mockRoute} navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Already confirmed? Sign in'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });
});

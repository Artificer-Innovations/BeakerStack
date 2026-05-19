import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AuthCallbackScreen from '../../src/screens/AuthCallbackScreen';

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
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

const mockOnAuthStateChange = (require('../../src/lib/supabase') as {
  supabase: { auth: { onAuthStateChange: jest.Mock } };
}).supabase.auth.onAuthStateChange;

const mockReset = jest.fn();
const mockNavigation = { reset: mockReset, navigate: jest.fn() } as any;

describe('AuthCallbackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    }));
  });

  it('shows loading spinner', () => {
    const { getByText } = render(<AuthCallbackScreen navigation={mockNavigation} />);
    expect(getByText('Completing authentication...')).toBeTruthy();
  });

  it('resets to ResetPassword on PASSWORD_RECOVERY event', async () => {
    mockOnAuthStateChange.mockImplementation((cb: (event: string) => void) => {
      cb('PASSWORD_RECOVERY');
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallbackScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'ResetPassword' }],
      });
    });
    expect(mockReset).not.toHaveBeenCalledWith(
      expect.objectContaining({ routes: [{ name: 'Dashboard' }] })
    );
  });

  it('resets to Dashboard on SIGNED_IN event', async () => {
    mockOnAuthStateChange.mockImplementation((cb: (event: string) => void) => {
      cb('SIGNED_IN');
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallbackScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    });
    expect(mockReset).not.toHaveBeenCalledWith(
      expect.objectContaining({ routes: [{ name: 'ResetPassword' }] })
    );
  });

  it('resets to Login after 5s timeout if no auth event fires', () => {
    jest.useFakeTimers();

    render(<AuthCallbackScreen navigation={mockNavigation} />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Login' }],
    });

    jest.useRealTimers();
  });

  it('does not reset after timeout if auth event already handled', () => {
    jest.useFakeTimers();

    mockOnAuthStateChange.mockImplementation((cb: (event: string) => void) => {
      cb('SIGNED_IN');
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallbackScreen navigation={mockNavigation} />);

    // SIGNED_IN fires synchronously, then timeout fires — should only navigate once
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const dashboardCalls = mockReset.mock.calls.filter(
      (c) => c[0]?.routes?.[0]?.name === 'Dashboard'
    );
    const loginCalls = mockReset.mock.calls.filter(
      (c) => c[0]?.routes?.[0]?.name === 'Login'
    );
    expect(dashboardCalls).toHaveLength(1);
    expect(loginCalls).toHaveLength(0);

    jest.useRealTimers();
  });
});

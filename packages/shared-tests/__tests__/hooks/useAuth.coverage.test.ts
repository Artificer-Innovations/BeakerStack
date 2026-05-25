import { renderHook, act, waitFor } from '@testing-library/react';
import {
  configureGoogleSignIn,
  useAuth,
} from '@beakerstack/shared/hooks/useAuth';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser,
};

function createClient() {
  let authStateCallback:
    | ((event: string, session: Session | null) => void)
    | null = null;

  const mockClient = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      onAuthStateChange: jest.fn(callback => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  } as unknown as SupabaseClient;

  return { mockClient, getAuthStateCallback: () => authStateCallback };
}

describe('useAuth (web) — coverage gaps', () => {
  it('configureGoogleSignIn is a no-op on web', () => {
    expect(() => configureGoogleSignIn()).not.toThrow();
  });

  it('clears user when auth state changes to signed out', async () => {
    const { mockClient, getAuthStateCallback } = createClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      getAuthStateCallback()?.('SIGNED_IN', mockSession);
    });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    act(() => {
      getAuthStateCallback()?.('SIGNED_OUT', null);
    });
    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  it('signIn clears user and session when Supabase returns null data', async () => {
    const { mockClient } = createClient();
    const { result } = renderHook(() => useAuth(mockClient));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn('a@b.com', 'pw');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('signInWithGoogle uses redirectTo when window.location is available', async () => {
    const { mockClient } = createClient();
    const { result } = renderHook(() => useAuth(mockClient));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    });
  });

  it('signUp omits metadata when options.data is not provided', async () => {
    const { mockClient } = createClient();
    const { result } = renderHook(() => useAuth(mockClient));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.signUp('a@b.com', 'pw');
    });
    expect(mockClient.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: { emailRedirectTo: expect.any(String) },
    });
  });

  it('signUp includes metadata when options.data is provided', async () => {
    const { mockClient } = createClient();
    const { result } = renderHook(() => useAuth(mockClient));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.signUp('a@b.com', 'pw', {
        data: { full_name: 'Ada Lovelace' },
      });
    });
    expect(mockClient.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: {
        emailRedirectTo: expect.any(String),
        data: { full_name: 'Ada Lovelace' },
      },
    });
  });
});

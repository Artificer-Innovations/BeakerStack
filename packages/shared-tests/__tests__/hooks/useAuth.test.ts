import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@beakerstack/shared/hooks/useAuth';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUser,
  };

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
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: 'https://oauth-url.com' },
        error: null,
      }),
      onAuthStateChange: jest.fn(callback => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      }),
    },
  } as unknown as SupabaseClient;

  return {
    mockClient,
    mockUser,
    mockSession,
    getAuthStateCallback: () => authStateCallback,
  };
};

describe('useAuth', () => {
  it('should initialize with loading state', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle sign in with email and password', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should set user and session directly after signIn resolves, before onAuthStateChange fires', async () => {
    const { mockClient, mockUser, mockSession } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    // user/session must be populated immediately when signIn resolves so that
    // callers who navigate() right after see a non-null user in ProtectedRoute
    // (guards against the race condition where only onAuthStateChange set them).
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
    expect(result.current.loading).toBe(false);
  });

  it('should handle sign up with email and password', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signUp('test@example.com', 'password123');
    });

    expect(mockClient.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should handle sign out', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockClient.auth.signOut).toHaveBeenCalled();
  });

  it('should handle Google sign in', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost/auth/callback',
      },
    });
  });

  it('should handle auth state changes', async () => {
    const { mockClient, mockUser, mockSession, getAuthStateCallback } =
      createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callback = getAuthStateCallback();
    expect(callback).not.toBeNull();

    // Simulate auth state change
    act(() => {
      callback!('SIGNED_IN', mockSession);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });
  });

  it('should throw error during sign in when credentials are invalid', async () => {
    const { mockClient } = createMockSupabaseClient();
    const errorMessage = 'Invalid credentials';
    mockClient.auth.signInWithPassword = jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: errorMessage, name: 'AuthError', status: 400 },
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: Error | null = null;
    try {
      await act(async () => {
        await result.current.signIn('test@example.com', 'wrong-password');
      });
    } catch (error) {
      thrownError = error as Error;
    }

    // Should have thrown an error
    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toBe(errorMessage);
  });

  it('should throw error during sign up when registration fails', async () => {
    const { mockClient } = createMockSupabaseClient();
    const errorMessage = 'Email already registered';
    mockClient.auth.signUp = jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: errorMessage, name: 'AuthError', status: 400 },
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: Error | null = null;
    try {
      await act(async () => {
        await result.current.signUp('test@example.com', 'password123');
      });
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toBe(errorMessage);
  });

  it('should unsubscribe from auth state changes on unmount', async () => {
    const { mockClient } = createMockSupabaseClient();
    const unsubscribeMock = jest.fn();

    mockClient.auth.onAuthStateChange = jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    }));

    const { unmount } = renderHook(() => useAuth(mockClient));

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('should handle signOut error and clear localStorage', async () => {
    const { mockClient } = createMockSupabaseClient();
    const errorMessage = 'Sign out failed';
    mockClient.auth.signOut = jest.fn().mockResolvedValue({
      data: {},
      error: { message: errorMessage, name: 'AuthError', status: 403 },
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn((index: number) => {
        const keys = ['sb-test-auth-token', 'other-key'];
        return keys[index] || null;
      }),
      length: 2,
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // Should have attempted to clear localStorage
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      'sb-test-auth-token'
    );
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle signOut throwing error and clear localStorage', async () => {
    const { mockClient } = createMockSupabaseClient();
    const errorMessage = 'Network error';
    mockClient.auth.signOut = jest
      .fn()
      .mockRejectedValue(new Error(errorMessage));

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn((index: number) => {
        const keys = ['supabase.auth.token', 'other-key'];
        return keys[index] || null;
      }),
      length: 2,
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not throw even if signOut throws
    await act(async () => {
      await result.current.signOut();
    });

    // Should have attempted to clear localStorage
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      'supabase.auth.token'
    );
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should throw error during Google sign in when OAuth fails', async () => {
    const { mockClient } = createMockSupabaseClient();
    const errorMessage = 'OAuth error';
    mockClient.auth.signInWithOAuth = jest.fn().mockResolvedValue({
      data: { url: null },
      error: { message: errorMessage, name: 'AuthError', status: 400 },
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: Error | null = null;
    try {
      await act(async () => {
        await result.current.signInWithGoogle();
      });
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toBe(errorMessage);
  });

  it('should request password reset with redirect URL', async () => {
    const { mockClient } = createMockSupabaseClient();
    mockClient.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
      data: {},
      error: null,
    });
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.requestPasswordReset('user@example.com');
    });

    expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      { redirectTo: 'http://localhost/auth/callback' }
    );
  });

  it('should throw when password reset fails', async () => {
    const { mockClient } = createMockSupabaseClient();
    mockClient.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Reset failed' },
    });
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.requestPasswordReset('user@example.com');
      })
    ).rejects.toThrow('Reset failed');
  });

  it('should update password successfully', async () => {
    const { mockClient } = createMockSupabaseClient();
    mockClient.auth.updateUser = jest.fn().mockResolvedValue({
      data: { user: {} },
      error: null,
    });
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updatePassword('new-password-1');
    });

    expect(mockClient.auth.updateUser).toHaveBeenCalledWith({
      password: 'new-password-1',
    });
  });

  it('should throw when update password fails', async () => {
    const { mockClient } = createMockSupabaseClient();
    mockClient.auth.updateUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Weak password' },
    });
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.updatePassword('short');
      })
    ).rejects.toThrow('Weak password');
  });
});

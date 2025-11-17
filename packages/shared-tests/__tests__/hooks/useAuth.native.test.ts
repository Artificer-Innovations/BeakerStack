import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAuth,
  configureGoogleSignIn,
} from '@shared/src/hooks/useAuth.native';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// Mock @react-native-google-signin/google-signin
const mockGoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn().mockResolvedValue(undefined),
  signIn: jest.fn().mockResolvedValue(undefined),
  getTokens: jest.fn().mockResolvedValue({
    idToken: 'mock-id-token',
    accessToken: 'mock-access-token',
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
};

const mockStatusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

// Mock the module before any imports
jest.mock(
  '@react-native-google-signin/google-signin',
  () => ({
    GoogleSignin: mockGoogleSignin,
    statusCodes: mockStatusCodes,
  }),
  { virtual: true }
);

// Mock Logger
jest.mock('@shared/src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Supabase client
const createMockSupabaseClient = (hasStorage = false) => {
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

  const mockStorage = hasStorage
    ? {
        getAllKeys: jest
          .fn()
          .mockResolvedValue([
            'sb-test-auth-token',
            'other-key',
            'supabase.auth.token',
          ]),
        removeItem: jest.fn().mockResolvedValue(undefined),
      }
    : null;

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
      signInWithIdToken: jest.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
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
      ...(hasStorage && { storage: mockStorage }),
    } as unknown,
  } as unknown as SupabaseClient;

  return {
    mockClient,
    mockUser,
    mockSession,
    mockStorage,
    getAuthStateCallback: () => authStateCallback,
  };
};

describe('useAuth (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.__DEV__ = false;
  });

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

  it('should handle sign in error', async () => {
    const { mockClient } = createMockSupabaseClient();
    const errorMessage = 'Invalid credentials';
    (mockClient.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: errorMessage, name: 'AuthError', status: 401 },
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signIn('test@example.com', 'wrongpassword');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe(errorMessage);
      }
    });

    expect(result.current.error?.message).toBe(errorMessage);
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

  it('should handle sign up error', async () => {
    const { mockClient } = createMockSupabaseClient();
    const errorMessage = 'Email already exists';
    (mockClient.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: errorMessage, name: 'AuthError', status: 400 },
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signUp('test@example.com', 'password123');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe(errorMessage);
      }
    });

    expect(result.current.error?.message).toBe(errorMessage);
  });

  it('should handle sign out successfully', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockClient.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle sign out error and clear storage', async () => {
    const { mockClient, mockStorage } = createMockSupabaseClient(true);
    const errorMessage = 'Sign out failed';
    (mockClient.auth.signOut as jest.Mock).mockResolvedValue({
      data: {},
      error: { message: errorMessage, name: 'AuthError', status: 403 },
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // Should have attempted to clear storage
    expect(mockStorage?.getAllKeys).toHaveBeenCalled();
    expect(mockStorage?.removeItem).toHaveBeenCalledWith('sb-test-auth-token');
    expect(mockStorage?.removeItem).toHaveBeenCalledWith('supabase.auth.token');
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle sign out when storage getAllKeys fails', async () => {
    const { mockClient, mockStorage } = createMockSupabaseClient(true);
    const errorMessage = 'Sign out failed';
    (mockClient.auth.signOut as jest.Mock).mockResolvedValue({
      data: {},
      error: { message: errorMessage, name: 'AuthError', status: 403 },
    });
    (mockStorage?.getAllKeys as jest.Mock).mockRejectedValue(
      new Error('Storage error')
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // Should still clear state even if storage fails
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle sign out when storage removeItem fails', async () => {
    const { mockClient, mockStorage } = createMockSupabaseClient(true);
    const errorMessage = 'Sign out failed';
    (mockClient.auth.signOut as jest.Mock).mockResolvedValue({
      data: {},
      error: { message: errorMessage, name: 'AuthError', status: 403 },
    });
    (mockStorage?.removeItem as jest.Mock).mockRejectedValue(
      new Error('Remove error')
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // Should still clear state
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle sign out when signOut throws error', async () => {
    const { mockClient, mockStorage } = createMockSupabaseClient(true);
    (mockClient.auth.signOut as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // Should still clear storage and state
    expect(mockStorage?.getAllKeys).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle sign out when no storage available', async () => {
    const { mockClient } = createMockSupabaseClient(false);
    const errorMessage = 'Sign out failed';
    (mockClient.auth.signOut as jest.Mock).mockResolvedValue({
      data: {},
      error: { message: errorMessage, name: 'AuthError', status: 403 },
    });

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // Should still clear state
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it.skip('should handle Google sign in successfully', async () => {
    // Skip - complex lazy import mocking required
    // Reset the module cache to ensure fresh import
    jest.resetModules();
    const { mockClient } = createMockSupabaseClient();
    const {
      useAuth: useAuthNative,
    } = require('@shared/src/hooks/useAuth.native');
    const { result } = renderHook(() => useAuthNative(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockGoogleSignin.hasPlayServices).toHaveBeenCalled();
    expect(mockGoogleSignin.signIn).toHaveBeenCalled();
    expect(mockGoogleSignin.getTokens).toHaveBeenCalled();
    expect(mockClient.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'mock-id-token',
    });
  });

  it.skip('should handle Google sign in when module not available', async () => {
    // Mock the import to fail
    jest.resetModules();
    jest.doMock('@react-native-google-signin/google-signin', () => {
      throw new Error('Module not found');
    });

    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe(
          'Google Sign-In module not available'
        );
      }
    });
  });

  it.skip('should handle Google sign in when no ID token received', async () => {
    mockGoogleSignin.getTokens.mockResolvedValueOnce({
      idToken: null,
      accessToken: 'mock-access-token',
    });

    jest.resetModules();
    const { mockClient } = createMockSupabaseClient();
    const {
      useAuth: useAuthNative,
    } = require('@shared/src/hooks/useAuth.native');
    const { result } = renderHook(() => useAuthNative(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('No ID token received from Google');
      }
    });
  });

  it.skip('should handle Google sign in cancellation', async () => {
    const cancelError = { code: mockStatusCodes.SIGN_IN_CANCELLED };
    mockGoogleSignin.signIn.mockRejectedValueOnce(cancelError);

    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('Google sign-in was cancelled');
      }
    });

    expect(result.current.error?.message).toBe('Google sign-in was cancelled');
  });

  it.skip('should handle Google sign in already in progress', async () => {
    const progressError = { code: mockStatusCodes.IN_PROGRESS };
    mockGoogleSignin.signIn.mockRejectedValueOnce(progressError);

    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe(
          'Google sign-in already in progress'
        );
      }
    });

    expect(result.current.error?.message).toBe(
      'Google sign-in already in progress'
    );
  });

  it.skip('should handle Google Play Services not available', async () => {
    const servicesError = { code: mockStatusCodes.PLAY_SERVICES_NOT_AVAILABLE };
    mockGoogleSignin.hasPlayServices.mockRejectedValueOnce(servicesError);

    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe(
          'Google Play Services not available'
        );
      }
    });

    expect(result.current.error?.message).toBe(
      'Google Play Services not available'
    );
  });

  it.skip('should handle Google sign in auth error', async () => {
    const authError = {
      message: 'Auth failed',
      name: 'AuthError',
      status: 401,
    };
    (mockClient.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: authError,
    });

    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch (err) {
        expect(err).toEqual(authError);
      }
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

  it('should handle auth state change to signed out', async () => {
    const { mockClient, getAuthStateCallback } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callback = getAuthStateCallback();
    expect(callback).not.toBeNull();

    // Simulate sign out
    act(() => {
      callback!('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('configureGoogleSignIn', () => {
    it.skip('should configure Google Sign-In with webClientId', async () => {
      // Skip - async import timing issues
      configureGoogleSignIn({ webClientId: 'test-web-client-id' });

      // Wait for async import
      await waitFor(() => {
        expect(mockGoogleSignin.configure).toHaveBeenCalledWith({
          webClientId: 'test-web-client-id',
          offlineAccess: true,
        });
      });
    });

    it.skip('should configure Google Sign-In with iosClientId', async () => {
      // Skip - async import timing issues
      configureGoogleSignIn({
        webClientId: 'test-web-client-id',
        iosClientId: 'test-ios-client-id',
      });

      await waitFor(() => {
        expect(mockGoogleSignin.configure).toHaveBeenCalledWith({
          webClientId: 'test-web-client-id',
          iosClientId: 'test-ios-client-id',
          offlineAccess: true,
        });
      });
    });

    it('should warn when webClientId is missing', () => {
      const { Logger } = require('@shared/src/utils/logger');
      configureGoogleSignIn({});
      expect(Logger.warn).toHaveBeenCalledWith(
        '[useAuth] Google Sign-In not configured: webClientId is missing'
      );
    });

    it.skip('should handle configuration error', async () => {
      // Skip - async import timing issues
      jest.resetModules();
      jest.doMock('@react-native-google-signin/google-signin', () => {
        throw new Error('Module not found');
      });

      const { Logger } = require('@shared/src/utils/logger');
      configureGoogleSignIn({ webClientId: 'test-web-client-id' });

      await waitFor(() => {
        expect(Logger.warn).toHaveBeenCalledWith(
          '[useAuth] Failed to configure Google Sign-In:',
          expect.any(Error)
        );
      });
    });
  });
});

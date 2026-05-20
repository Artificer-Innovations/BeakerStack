import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAuth,
  configureGoogleSignIn,
  resetGoogleSignInModuleStateForTests,
} from '@beakerstack/shared/hooks/useAuth.native';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        googleWebClientId: 'test-web-client-id',
        googleIosClientId: 'test-ios-client-id',
        googleAndroidClientId: 'test-android-client-id',
      },
    },
    manifest: {
      extra: {
        googleWebClientId: 'test-web-client-id',
        googleIosClientId: 'test-ios-client-id',
        googleAndroidClientId: 'test-android-client-id',
      },
    },
  },
}));

/** Mutable flags read by the hoisted Google Sign-In mock factory and getters */
const googleSignInMockControl = {
  /** Synchronous throw when the module is first evaluated (import().catch path) */
  throwOnFactory: false,
  /** Throw when accessing GoogleSignin / statusCodes exports (getGoogleSignIn catch) */
  throwOnAccess: false,
  throwMessage: 'Module not found',
};

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

jest.mock(
  '@react-native-google-signin/google-signin',
  () => {
    if (googleSignInMockControl.throwOnFactory) {
      throw new Error(googleSignInMockControl.throwMessage);
    }
    return {
      get GoogleSignin() {
        if (googleSignInMockControl.throwOnAccess) {
          throw new Error(googleSignInMockControl.throwMessage);
        }
        return mockGoogleSignin;
      },
      get statusCodes() {
        if (googleSignInMockControl.throwOnAccess) {
          throw new Error(googleSignInMockControl.throwMessage);
        }
        return mockStatusCodes;
      },
    };
  },
  { virtual: true }
);

jest.mock('@beakerstack/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

async function flushPromises(times = 8) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

/**
 * `configureGoogleSignIn` schedules work with `setTimeout(100)`; the timeout must be
 * registered while fake timers are active, then advanced, or the callback never runs.
 */
async function runDeferredGoogleConfigure(setup: () => void): Promise<void> {
  jest.useFakeTimers();
  try {
    setup();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    await act(async () => {
      await flushPromises();
    });
  } finally {
    jest.useRealTimers();
  }
}

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
    resetGoogleSignInModuleStateForTests();
    googleSignInMockControl.throwOnFactory = false;
    googleSignInMockControl.throwOnAccess = false;
    // @ts-expect-error test-only assignment to global __DEV__
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

    expect(mockStorage?.getAllKeys).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should warn when getAllKeys fails in catch path after signOut throws', async () => {
    const { Logger } = require('@beakerstack/logger');
    const { mockClient, mockStorage } = createMockSupabaseClient(true);
    (mockClient.auth.signOut as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );
    (mockStorage?.getAllKeys as jest.Mock).mockRejectedValue(
      new Error('Storage error in catch')
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(Logger.warn).toHaveBeenCalledWith(
      '[useAuth] Failed to clear AsyncStorage:',
      expect.any(Error)
    );
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

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
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

    act(() => {
      callback!('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  it('should warn when configureGoogleSignIn called without webClientId', () => {
    const { Logger } = require('@beakerstack/logger');
    configureGoogleSignIn({});
    expect(Logger.warn).toHaveBeenCalledWith(
      '[useAuth] Google Sign-In not configured: webClientId is missing',
      expect.objectContaining({
        hasWebClientId: false,
        hasIosClientId: false,
        hasAndroidClientId: false,
      })
    );
  });
});

describe('Google Sign-In and configureGoogleSignIn', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    resetGoogleSignInModuleStateForTests();
    jest.clearAllMocks();
    googleSignInMockControl.throwOnFactory = false;
    googleSignInMockControl.throwOnAccess = false;
    mockGoogleSignin.configure.mockReset();
    mockGoogleSignin.hasPlayServices.mockReset();
    mockGoogleSignin.hasPlayServices.mockResolvedValue(undefined);
    mockGoogleSignin.signIn.mockReset();
    mockGoogleSignin.signIn.mockResolvedValue(undefined);
    mockGoogleSignin.getTokens.mockReset();
    mockGoogleSignin.getTokens.mockResolvedValue({
      idToken: 'mock-id-token',
      accessToken: 'mock-access-token',
    });
  });

  // Runs first: @react-native-google-signin/google-signin must not be cached yet
  // so `throwOnFactory` is honored at module evaluation (import().catch path).
  it('should log Logger.error when Google Sign-In import fails during configure', async () => {
    const { Logger } = require('@beakerstack/logger');
    await runDeferredGoogleConfigure(() => {
      googleSignInMockControl.throwOnFactory = true;
      configureGoogleSignIn({ webClientId: 'test-web-client-id' });
    });
    expect(Logger.error).toHaveBeenCalledWith(
      '[useAuth]',
      expect.stringContaining('Failed to import Google Sign-In module'),
      expect.any(Error)
    );
  });

  it('should configure Google Sign-In with webClientId', async () => {
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );
    expect(mockGoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'test-web-client-id',
      offlineAccess: true,
    });
  });

  it('should configure Google Sign-In with iosClientId', async () => {
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({
        webClientId: 'test-web-client-id',
        iosClientId: 'test-ios-client-id',
      })
    );
    expect(mockGoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'test-web-client-id',
      iosClientId: 'test-ios-client-id',
      offlineAccess: true,
    });
  });

  it('should return same promise when configureGoogleSignIn called again after success', async () => {
    let p1!: Promise<void>;
    await runDeferredGoogleConfigure(() => {
      p1 = configureGoogleSignIn({ webClientId: 'test-web-client-id' });
    });
    expect(mockGoogleSignin.configure).toHaveBeenCalledTimes(1);
    const p2 = configureGoogleSignIn({ webClientId: 'test-web-client-id' });
    expect(p2).toBe(p1);
    await expect(p2).resolves.toBeUndefined();
    expect(mockGoogleSignin.configure).toHaveBeenCalledTimes(1);
  });

  it('should log Logger.error when GoogleSignin.configure throws', async () => {
    const { Logger } = require('@beakerstack/logger');
    mockGoogleSignin.configure.mockImplementationOnce(() => {
      throw new Error('configure boom');
    });
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );
    expect(Logger.error).toHaveBeenCalledWith(
      '[useAuth]',
      expect.stringContaining('Failed to configure Google Sign-In'),
      expect.any(Error)
    );
  });

  it('should handle Google sign in successfully', async () => {
    const { mockClient } = createMockSupabaseClient();
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );

    const { result } = renderHook(() => useAuth(mockClient));

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

  it('should handle Google sign in when module not available', async () => {
    const { Logger } = require('@beakerstack/logger');
    googleSignInMockControl.throwOnAccess = true;
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow(
        'Google Sign-In module not available'
      );
    });

    expect(Logger.warn).toHaveBeenCalledWith(
      '[useAuth] Google Sign-In module not available:',
      expect.any(Error)
    );
  });

  it('should handle Google sign in when no ID token received', async () => {
    mockGoogleSignin.getTokens.mockResolvedValueOnce({
      idToken: null,
      accessToken: 'mock-access-token',
    });
    const { mockClient } = createMockSupabaseClient();
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow(
        'No ID token received from Google'
      );
    });
  });

  it('should handle Google sign in cancellation', async () => {
    const cancelError = { code: mockStatusCodes.SIGN_IN_CANCELLED };
    mockGoogleSignin.signIn.mockRejectedValueOnce(cancelError);
    const { mockClient } = createMockSupabaseClient();
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow(
        'Google sign-in was cancelled'
      );
    });

    expect(result.current.error?.message).toBe('Google sign-in was cancelled');
  });

  it('should handle Google sign in already in progress', async () => {
    const progressError = { code: mockStatusCodes.IN_PROGRESS };
    mockGoogleSignin.signIn.mockRejectedValueOnce(progressError);
    const { mockClient } = createMockSupabaseClient();
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow(
        'Google sign-in already in progress'
      );
    });

    expect(result.current.error?.message).toBe(
      'Google sign-in already in progress'
    );
  });

  it('should handle Google Play Services not available', async () => {
    const servicesError = { code: mockStatusCodes.PLAY_SERVICES_NOT_AVAILABLE };
    mockGoogleSignin.hasPlayServices.mockRejectedValueOnce(servicesError);
    const { mockClient } = createMockSupabaseClient();
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow(
        'Google Play Services not available'
      );
    });

    expect(result.current.error?.message).toBe(
      'Google Play Services not available'
    );
  });

  it('should handle Google sign in auth error', async () => {
    const authError = new Error('Auth failed');
    const { mockClient } = createMockSupabaseClient();
    (mockClient.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: authError,
    });
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow(
        'Auth failed'
      );
    });

    expect(result.current.error?.message).toBe('Auth failed');
  });

  it('should throw when Google Sign-In not configured before signInWithGoogle', async () => {
    const { Logger } = require('@beakerstack/logger');
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow(
        /Google Sign-In not configured/
      );
    });

    expect(Logger.error).toHaveBeenCalledWith(
      '[useAuth]',
      expect.stringContaining('Google Sign-In not configured')
    );
  });

  it('should log unknown Google error code and rethrow', async () => {
    const { Logger } = require('@beakerstack/logger');
    mockGoogleSignin.signIn.mockRejectedValueOnce({ code: 'UNKNOWN_CODE' });
    const { mockClient } = createMockSupabaseClient();
    await runDeferredGoogleConfigure(() =>
      configureGoogleSignIn({ webClientId: 'test-web-client-id' })
    );

    const { result } = renderHook(() => useAuth(mockClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      '[useAuth] Unknown Google Sign-In error code:',
      'UNKNOWN_CODE'
    );
  });

  it('should request password reset with mobile deep link', async () => {
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
      { redirectTo: 'beaker-stack://auth/callback' }
    );
  });

  it('should throw when native password reset fails', async () => {
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

  it('should update password successfully on native', async () => {
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

  it('should throw when native update password fails', async () => {
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

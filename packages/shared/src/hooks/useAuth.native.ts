import { useState, useEffect } from 'react';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { AuthHookReturn } from '../types/auth';
import { Logger } from '../utils/logger';

type GoogleSignInModule = {
  configure(config: {
    webClientId: string;
    iosClientId?: string;
    offlineAccess: boolean;
  }): void;
  hasPlayServices(options?: {
    showPlayServicesUpdateDialog?: boolean;
  }): Promise<void>;
  signIn(): Promise<void>;
  getTokens(): Promise<{ idToken: string | null; accessToken?: string | null }>;
  signOut(): Promise<void>;
};

type GoogleStatusCodes = {
  SIGN_IN_CANCELLED: string;
  IN_PROGRESS: string;
  PLAY_SERVICES_NOT_AVAILABLE: string;
  [key: string]: string;
};

type SupabaseAuthStorage = {
  getAllKeys: () => Promise<string[]>;
  removeItem: (key: string) => Promise<void>;
};

// Lazy import to prevent native module from loading during bundle initialization
let GoogleSignin: GoogleSignInModule | null = null;
let statusCodes: GoogleStatusCodes | null = null;
let isConfigured = false;
let configurePromise: Promise<void> | null = null;

async function getGoogleSignIn(): Promise<{
  GoogleSignin: GoogleSignInModule | null;
  statusCodes: GoogleStatusCodes | null;
}> {
  if (!GoogleSignin) {
    try {
      const module = await import('@react-native-google-signin/google-signin');
      GoogleSignin = module.GoogleSignin as GoogleSignInModule;
      statusCodes = module.statusCodes as GoogleStatusCodes;
    } catch (err) {
      Logger.warn('[useAuth] Google Sign-In module not available:', err);
    }
  }
  return { GoogleSignin, statusCodes };
}

const getAuthStorage = (client: SupabaseClient): SupabaseAuthStorage | null => {
  const authCandidate = client.auth as unknown;
  if (
    authCandidate &&
    typeof authCandidate === 'object' &&
    'storage' in authCandidate
  ) {
    const potentialStorage = (authCandidate as { storage?: unknown }).storage;
    if (
      potentialStorage &&
      typeof potentialStorage === 'object' &&
      'getAllKeys' in potentialStorage &&
      'removeItem' in potentialStorage &&
      typeof (potentialStorage as { getAllKeys?: unknown }).getAllKeys ===
        'function' &&
      typeof (potentialStorage as { removeItem?: unknown }).removeItem ===
        'function'
    ) {
      return potentialStorage as SupabaseAuthStorage;
    }
  }
  return null;
};

// Export this function to be called on app startup
// Client IDs must be provided from the app (via Constants.expoConfig.extra)
export function configureGoogleSignIn(options?: {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
}): Promise<void> {
  // If already configured, return resolved promise
  if (isConfigured && configurePromise) {
    return configurePromise;
  }

  // webClientId is required by Google Sign-In library
  const webClientId = options?.webClientId;
  if (!webClientId) {
    Logger.warn(
      '[useAuth] Google Sign-In not configured: webClientId is missing'
    );
    return Promise.resolve();
  }

  // Create a promise that resolves when configuration is complete
  // Use setTimeout to defer the import until after React Native has fully initialized
  // This prevents the dynamic import from blocking app startup
  configurePromise = new Promise<void>(resolve => {
    // Defer the import to the next tick to ensure React Native bridge is ready
    // Use a small delay (100ms) to ensure React Native is fully initialized
    setTimeout(() => {
      import('@react-native-google-signin/google-signin')
        .then(module => {
          try {
            // IMPORTANT: Both webClientId and iosClientId are required.
            // - webClientId: Used for the ID token audience (Supabase requires this)
            // - iosClientId: Required for native iOS initialization
            // When both are provided, the library uses webClientId for the ID token,
            // which is what Supabase expects for verification.
            const config: {
              webClientId: string;
              iosClientId?: string;
              offlineAccess: boolean;
            } = {
              webClientId,
              offlineAccess: true,
            };

            // iosClientId is required for iOS - the library needs it for initialization
            // but the ID token will still use webClientId as the audience
            if (options?.iosClientId) {
              config.iosClientId = options.iosClientId;
            }

            if (__DEV__) {
              Logger.debug('[useAuth] Configuring Google Sign-In with:', {
                hasWebClientId: !!webClientId,
                hasIosClientId: !!config.iosClientId,
                webClientIdLength: webClientId?.length ?? 0,
              });
            }

            module.GoogleSignin.configure(config);
            isConfigured = true;

            if (__DEV__) {
              Logger.debug('[useAuth] Google Sign-In configured successfully');
            }
            resolve();
          } catch (configErr) {
            const errorMsg = `Failed to configure Google Sign-In: ${configErr instanceof Error ? configErr.message : String(configErr)}`;
            Logger.error('[useAuth]', errorMsg, configErr);
            isConfigured = false;
            configurePromise = null;
            // Don't reject - allow app to continue without Google Sign-In
            // But log the error clearly so it's visible
            resolve();
          }
        })
        .catch(err => {
          const errorMsg = `Failed to import Google Sign-In module: ${err instanceof Error ? err.message : String(err)}`;
          Logger.error('[useAuth]', errorMsg, err);
          isConfigured = false;
          configurePromise = null;
          // Don't reject - allow app to continue without Google Sign-In
          // But log the error clearly so it's visible
          resolve();
        });
    }, 100); // Increased delay to 100ms to ensure React Native bridge is ready
  });

  return configurePromise;
}

export function useAuth(supabaseClient: SupabaseClient): AuthHookReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabaseClient.auth.signInWithPassword(
      {
        email,
        password,
      }
    );

    setLoading(false);

    if (signInError) {
      const errorObj = new Error(signInError.message);
      setError(errorObj);
      throw errorObj;
    }
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      const errorObj = new Error(signUpError.message);
      setError(errorObj);
      throw errorObj;
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Try to sign out with local scope first
      const { error: signOutError } = await supabaseClient.auth.signOut({
        scope: 'local',
      });

      // If signOut API call fails (e.g., 403), manually clear the session storage
      // This handles cases where the session is invalid/expired on the server
      if (signOutError) {
        Logger.warn(
          '[useAuth] signOut API call failed, manually clearing session storage:',
          signOutError.message
        );
        // Directly clear Supabase's AsyncStorage entries
        // Access the storage adapter from the client's internal config
        const storage = getAuthStorage(supabaseClient);
        if (storage && typeof storage.removeItem === 'function') {
          // Clear all Supabase auth-related keys from AsyncStorage
          // Supabase uses keys like 'sb-<project-ref>-auth-token'
          try {
            const allKeys = await storage.getAllKeys();
            if (Array.isArray(allKeys)) {
              const supabaseKeys = allKeys.filter(
                (key: string) =>
                  key.startsWith('sb-') || key.includes('supabase.auth.token')
              );
              await Promise.all(
                supabaseKeys.map((key: string) => storage.removeItem(key))
              );
            }
          } catch (storageErr) {
            Logger.warn('[useAuth] Failed to clear AsyncStorage:', storageErr);
          }
        }
        // Clear state directly
        setSession(null);
        setUser(null);
      }

      setLoading(false);
    } catch (err) {
      // If signOut throws an error, still clear the session storage
      Logger.warn(
        '[useAuth] signOut threw error, manually clearing session storage:',
        err
      );
      // Try to clear AsyncStorage
      try {
        const storage = getAuthStorage(supabaseClient);
        if (storage) {
          const allKeys = await storage.getAllKeys();
          if (Array.isArray(allKeys)) {
            const supabaseKeys = allKeys.filter(
              (key: string) =>
                key.startsWith('sb-') || key.includes('supabase.auth.token')
            );
            await Promise.all(
              supabaseKeys.map((key: string) => storage.removeItem(key))
            );
          }
        }
      } catch (storageErr) {
        Logger.warn('[useAuth] Failed to clear AsyncStorage:', storageErr);
      }
      setSession(null);
      setUser(null);
      setLoading(false);
      // Don't throw - we've cleared the session storage, which is what we wanted
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Ensure Google Sign-In is configured before attempting sign-in
      // Wait for configuration to complete if it's in progress
      if (configurePromise) {
        await configurePromise;
      }

      const { GoogleSignin: GSI, statusCodes: codes } = await getGoogleSignIn();

      if (!GSI || !codes) {
        throw new Error('Google Sign-In module not available');
      }

      // Check if configured (for Android, this is critical)
      if (!isConfigured) {
        const errorMsg =
          'Google Sign-In not configured. Configuration may have failed silently. ' +
          'Please check the logs for configuration errors and ensure webClientId is set.';
        Logger.error('[useAuth]', errorMsg);
        throw new Error(errorMsg);
      }

      await GSI.hasPlayServices();
      await GSI.signIn();

      const tokens = await GSI.getTokens();

      if (!tokens.idToken) {
        throw new Error('No ID token received from Google');
      }

      if (__DEV__) {
        Logger.debug('[Google Sign-In] Got ID token');
      }

      // Sign in with Supabase
      // Note: The nonce check is controlled by Supabase server configuration (skip_nonce_check)
      // If you see "Passed nonce and nonce in id_token should either both exist or not" errors,
      // ensure your Supabase instance has skip_nonce_check = true for Google in config.toml
      const { error: authError } = await supabaseClient.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.idToken,
      });

      if (authError) {
        throw authError;
      }

      if (__DEV__) {
        Logger.debug(
          '[Google Sign-In] Successfully authenticated with Supabase'
        );
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const { statusCodes: codes } = await getGoogleSignIn();
        if (codes) {
          const code = (err as { code?: string }).code;

          if (code === codes.SIGN_IN_CANCELLED) {
            const cancelError = new Error('Google sign-in was cancelled');
            setError(cancelError);
            throw cancelError;
          }

          if (code === codes.IN_PROGRESS) {
            const progressError = new Error(
              'Google sign-in already in progress'
            );
            setError(progressError);
            throw progressError;
          }

          if (code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
            const servicesError = new Error(
              'Google Play Services not available'
            );
            setError(servicesError);
            throw servicesError;
          }
        }
      }

      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };
}

import { useState, useEffect } from 'react';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { AuthHookReturn } from '../types/auth';

// Lazy import to prevent native module from loading during bundle initialization
let GoogleSignin: any = null;
let statusCodes: any = null;

async function getGoogleSignIn() {
  if (!GoogleSignin) {
    try {
      const module = await import('@react-native-google-signin/google-signin');
      GoogleSignin = module.GoogleSignin;
      statusCodes = module.statusCodes;
    } catch (err) {
      console.warn('[useAuth] Google Sign-In module not available:', err);
    }
  }
  return { GoogleSignin, statusCodes };
}

// Export this function to be called on app startup
// Client IDs must be provided from the app (via Constants.expoConfig.extra)
export function configureGoogleSignIn(options?: {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
}) {
  // webClientId is required by Google Sign-In library
  const webClientId = options?.webClientId;
  if (!webClientId) {
    console.warn('[useAuth] Google Sign-In not configured: webClientId is missing');
    return;
  }

  // Lazy configure - only import when actually called
  import('@react-native-google-signin/google-signin')
    .then((module) => {
      // Only pass defined values - don't pass undefined properties
      const config: {
        webClientId: string;
        iosClientId?: string;
        offlineAccess: boolean;
      } = {
        webClientId,
        offlineAccess: true,
      };
      
      if (options?.iosClientId) {
        config.iosClientId = options.iosClientId;
      }
      
      // Note: Android typically uses webClientId, but we accept androidClientId
      // for potential future use or custom configuration
      
      module.GoogleSignin.configure(config);
    })
    .catch((err) => {
      console.warn('[useAuth] Failed to configure Google Sign-In:', err);
    });
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

    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

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
      const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'local' });

      // If signOut API call fails (e.g., 403), manually clear the session storage
      // This handles cases where the session is invalid/expired on the server
      if (signOutError) {
        console.warn('[useAuth] signOut API call failed, manually clearing session storage:', signOutError.message);
        // Directly clear Supabase's AsyncStorage entries
        // Access the storage adapter from the client's internal config
        const storage = (supabaseClient.auth as any).storage;
        if (storage && typeof storage.removeItem === 'function') {
          // Clear all Supabase auth-related keys from AsyncStorage
          // Supabase uses keys like 'sb-<project-ref>-auth-token'
          try {
            const allKeys = await storage.getAllKeys();
            if (Array.isArray(allKeys)) {
              const supabaseKeys = allKeys.filter((key: string) => 
                key.startsWith('sb-') || key.includes('supabase.auth.token')
              );
              await Promise.all(supabaseKeys.map((key: string) => storage.removeItem(key)));
            }
          } catch (storageErr) {
            console.warn('[useAuth] Failed to clear AsyncStorage:', storageErr);
          }
        }
        // Clear state directly
        setSession(null);
        setUser(null);
      }

      setLoading(false);
    } catch (err) {
      // If signOut throws an error, still clear the session storage
      console.warn('[useAuth] signOut threw error, manually clearing session storage:', err);
      // Try to clear AsyncStorage
      try {
        const storage = (supabaseClient.auth as any).storage;
        if (storage && typeof storage.getAllKeys === 'function') {
          const allKeys = await storage.getAllKeys();
          if (Array.isArray(allKeys)) {
            const supabaseKeys = allKeys.filter((key: string) => 
              key.startsWith('sb-') || key.includes('supabase.auth.token')
            );
            await Promise.all(supabaseKeys.map((key: string) => storage.removeItem(key)));
          }
        }
      } catch (storageErr) {
        console.warn('[useAuth] Failed to clear AsyncStorage:', storageErr);
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
      const { GoogleSignin: GSI, statusCodes: codes } = await getGoogleSignIn();
      
      if (!GSI || !codes) {
        throw new Error('Google Sign-In module not available');
      }

      await GSI.hasPlayServices();
      await GSI.signIn();

      const tokens = await GSI.getTokens();

      if (!tokens.idToken) {
        throw new Error('No ID token received from Google');
      }

      if (__DEV__) {
        console.log('[Google Sign-In] Got ID token');
      }

      const { error: authError } = await supabaseClient.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.idToken,
      });

      if (authError) {
        throw authError;
      }

      if (__DEV__) {
        console.log('[Google Sign-In] Successfully authenticated with Supabase');
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
            const progressError = new Error('Google sign-in already in progress');
            setError(progressError);
            throw progressError;
          }

          if (code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
            const servicesError = new Error('Google Play Services not available');
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


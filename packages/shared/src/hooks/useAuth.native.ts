import { useState, useEffect } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { AuthHookReturn } from '../types/auth';

// Export this function to be called on app startup
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
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

    const { error: signOutError } = await supabaseClient.auth.signOut();

    setLoading(false);

    if (signOutError) {
      const errorObj = new Error(signOutError.message);
      setError(errorObj);
      throw errorObj;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();

      const tokens = await GoogleSignin.getTokens();

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
        const code = (err as { code?: string }).code;

        if (code === statusCodes.SIGN_IN_CANCELLED) {
          const cancelError = new Error('Google sign-in was cancelled');
          setError(cancelError);
          throw cancelError;
        }

        if (code === statusCodes.IN_PROGRESS) {
          const progressError = new Error('Google sign-in already in progress');
          setError(progressError);
          throw progressError;
        }

        if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          const servicesError = new Error('Google Play Services not available');
          setError(servicesError);
          throw servicesError;
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


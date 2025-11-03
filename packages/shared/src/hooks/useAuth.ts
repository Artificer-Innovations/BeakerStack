import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthHookReturn } from '../types/auth';

// Web platform does not require native Google configuration
export function configureGoogleSignIn() {}

export function useAuth(supabaseClient: SupabaseClient): AuthHookReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    
    setLoading(false);
    
    if (error) {
      const errorObj = new Error(error.message);
      setError(errorObj);
      throw errorObj;
    }
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    
    setLoading(false);
    
    if (error) {
      const errorObj = new Error(error.message);
      setError(errorObj);
      throw errorObj;
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to sign out with local scope first
      const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
      
      // If signOut API call fails (e.g., 403), manually clear the session storage
      // This handles cases where the session is invalid/expired on the server
      if (error) {
        console.warn('[useAuth] signOut API call failed, manually clearing session storage:', error.message);
        // Directly clear Supabase's localStorage entries
        // Supabase stores session data with keys based on the URL
        if (typeof window !== 'undefined' && window.localStorage) {
          // Supabase uses a storage key format: sb-<project-ref>-auth-token
          // We'll clear all keys that start with 'sb-' to catch all Supabase storage
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => window.localStorage.removeItem(key));
        }
        // Clear state directly
        setSession(null);
        setUser(null);
      }
      
      setLoading(false);
    } catch (err) {
      // If signOut throws an error, still clear the session storage
      console.warn('[useAuth] signOut threw error, manually clearing session storage:', err);
      // Directly clear Supabase's localStorage entries
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key));
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

    const redirectTo =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const authArgs = redirectTo
      ? {
          provider: 'google' as const,
          options: { redirectTo },
        }
      : {
          provider: 'google' as const,
        };

    const { error } = await supabaseClient.auth.signInWithOAuth(authArgs);

    setLoading(false);

    if (error) {
      const errorObj = new Error(error.message);
      setError(errorObj);
      throw errorObj;
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


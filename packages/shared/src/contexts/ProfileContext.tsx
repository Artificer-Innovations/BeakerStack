import { createContext, useContext, ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useProfile } from '../hooks/useProfile';
import { useAuthContext } from './AuthContext';
import type { ProfileHookReturn } from '../hooks/useProfile';

interface ProfileProviderProps {
  children: ReactNode;
  supabaseClient: SupabaseClient;
}

// Create the context with undefined as default (will throw if used without provider)
const ProfileContext = createContext<ProfileHookReturn | undefined>(undefined);

/**
 * ProfileProvider component that wraps the app and provides profile state
 * Automatically fetches profile when user changes via AuthContext
 * @param children - Child components that will have access to profile context
 * @param supabaseClient - Supabase client instance for profile operations
 */
export function ProfileProvider({
  children,
  supabaseClient,
}: ProfileProviderProps) {
  const auth = useAuthContext();
  const profile = useProfile(supabaseClient, auth.user);

  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * Hook to access profile context
 * Must be used within a ProfileProvider (and AuthProvider)
 * @throws Error if used outside of ProfileProvider
 * @returns Profile state and actions
 */
export function useProfileContext(): ProfileHookReturn {
  const context = useContext(ProfileContext);

  if (context === undefined) {
    throw new Error(
      'useProfileContext must be used within a ProfileProvider. Wrap your component tree with <ProfileProvider supabaseClient={client}> inside <AuthProvider>.'
    );
  }

  return context;
}

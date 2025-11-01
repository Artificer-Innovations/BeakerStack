import { createContext, useContext, ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import type { AuthHookReturn } from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
  supabaseClient: SupabaseClient;
}

// Create the context with undefined as default (will throw if used without provider)
const AuthContext = createContext<AuthHookReturn | undefined>(undefined);

/**
 * AuthProvider component that wraps the app and provides authentication state
 * @param children - Child components that will have access to auth context
 * @param supabaseClient - Supabase client instance for authentication
 */
export function AuthProvider({ children, supabaseClient }: AuthProviderProps) {
  const auth = useAuth(supabaseClient);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 * @throws Error if used outside of AuthProvider
 * @returns Authentication state and actions
 */
export function useAuthContext(): AuthHookReturn {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}


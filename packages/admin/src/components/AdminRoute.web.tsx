import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useIsAdmin } from '../hooks/useIsAdmin.js';

export type AdminRouteProps = {
  children: ReactNode;
  supabase: SupabaseClient;
  userId: string | undefined;
  authLoading?: boolean;
  loginPath?: string;
  notAuthorizedPath?: string;
};

/**
 * Composable route guard: requires authenticated admin session.
 * Unauthenticated users go to login; authenticated non-admins to not-authorized.
 */
export function AdminRoute({
  children,
  supabase,
  userId,
  authLoading = false,
  loginPath = '/login',
  notAuthorizedPath = '/not-authorized',
}: AdminRouteProps) {
  const location = useLocation();
  const { isAdmin, loading: adminLoading } = useIsAdmin(supabase, userId);

  if (authLoading || adminLoading) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4'>
        <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' />
        <p className='text-sm text-gray-600'>Loading…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to={notAuthorizedPath} replace />;
  }

  return <>{children}</>;
}

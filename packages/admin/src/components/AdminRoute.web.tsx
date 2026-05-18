import { useEffect, type ReactNode } from 'react';
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
 * RPC failures show a recoverable error (not conflated with not-authorized).
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
  const {
    isAdmin,
    loading: adminLoading,
    error,
    refresh,
  } = useIsAdmin(supabase, userId);

  useEffect(() => {
    if (!userId || typeof document === 'undefined') return;

    const recheck = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [userId, refresh]);

  if (authLoading || adminLoading) {
    return (
      <AdminRouteMessage>
        <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' />
        <p className='text-sm text-gray-600'>Loading…</p>
      </AdminRouteMessage>
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

  if (error) {
    return (
      <AdminRouteMessage>
        <h1 className='text-lg font-semibold text-gray-900'>
          Admin check failed
        </h1>
        <p className='text-sm text-gray-600 max-w-md text-center' role='alert'>
          {error.message}
        </p>
        <button
          type='button'
          onClick={() => void refresh()}
          className='rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700'
        >
          Try again
        </button>
      </AdminRouteMessage>
    );
  }

  if (!isAdmin) {
    return <Navigate to={notAuthorizedPath} replace />;
  }

  return <>{children}</>;
}

function AdminRouteMessage({ children }: { children: ReactNode }) {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 px-4'>
      {children}
    </div>
  );
}

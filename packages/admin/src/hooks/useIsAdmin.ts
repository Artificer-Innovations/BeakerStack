import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkIsAdmin } from '../adminClient.js';

export type UseIsAdminResult = {
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

type AdminCheckState = {
  userId: string | undefined;
  isAdmin: boolean;
  status: 'idle' | 'loading' | 'done';
};

/**
 * Returns whether the current session user is an active app admin.
 * Defaults to false while loading or on error.
 */
export function useIsAdmin(
  supabase: SupabaseClient | null,
  userId: string | undefined
): UseIsAdminResult {
  const [state, setState] = useState<AdminCheckState>({
    userId: undefined,
    isAdmin: false,
    status: 'idle',
  });
  const [error, setError] = useState<Error | null>(null);

  // Treat a new userId as "loading" on the first render so route guards do not
  // redirect to not-authorized before the RPC runs (useEffect runs after paint).
  const loading =
    Boolean(userId) && (state.userId !== userId || state.status === 'loading');
  const isAdmin = state.userId === userId && state.isAdmin;

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setState({ userId: undefined, isAdmin: false, status: 'idle' });
      setError(null);
      return;
    }

    const checkFor = userId;
    setState({ userId: checkFor, isAdmin: false, status: 'loading' });
    setError(null);
    try {
      const ok = await checkIsAdmin(supabase);
      setState(prev => {
        if (checkFor !== userId) return prev;
        return { userId: checkFor, isAdmin: ok, status: 'done' };
      });
    } catch (e) {
      setState(prev => {
        if (checkFor !== userId) return prev;
        return { userId: checkFor, isAdmin: false, status: 'done' };
      });
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [supabase, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isAdmin, loading, error, refresh };
}

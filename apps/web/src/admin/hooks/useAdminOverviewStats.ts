import { useEffect, useState } from 'react';
import { listUsers } from '@beakerstack/admin';
import {
  getAdminWaitlistSettings,
  listWaitlistEntries,
  type SignupMode,
} from '@beakerstack/waitlist';
import { supabase } from '../../lib/supabase';
import { adminProductId } from '../adminUsageColumns';

interface AdminOverviewStats {
  usersTotal: number | null;
  waitlistPending: number | null;
  signupMode: SignupMode | null;
  loading: boolean;
  error: Error | null;
}

export function useAdminOverviewStats(): AdminOverviewStats {
  const [usersTotal, setUsersTotal] = useState<number | null>(null);
  const [waitlistPending, setWaitlistPending] = useState<number | null>(null);
  const [signupMode, setSignupMode] = useState<SignupMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      listUsers(supabase, { limit: 1, offset: 0, productId: adminProductId }),
      listWaitlistEntries(supabase, { limit: 1, offset: 0, status: 'pending' }),
      getAdminWaitlistSettings(supabase),
    ])
      .then(([usersResult, waitlistResult, settings]) => {
        if (cancelled) return;
        setUsersTotal(usersResult.total);
        setWaitlistPending(waitlistResult.total);
        setSignupMode(settings?.signup_mode ?? null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { usersTotal, waitlistPending, signupMode, loading, error };
}

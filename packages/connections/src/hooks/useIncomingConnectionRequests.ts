import { useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useConnections } from './useConnections.js';
import { CONNECTIONS_PENDING_STATUS_FILTER } from './statusFilters.js';

export function useIncomingConnectionRequests(
  supabase: SupabaseClient,
  userId: string | null
) {
  const { rows, loading, error, refresh } = useConnections({
    supabase,
    userId,
    status: CONNECTIONS_PENDING_STATUS_FILTER,
  });

  const incoming = useMemo(
    () =>
      rows.filter(
        r =>
          r.recipient_user_id === userId &&
          r.effective_status === 'pending' &&
          !r.is_initiator
      ),
    [rows, userId]
  );

  return { incoming, loading, error, refresh };
}

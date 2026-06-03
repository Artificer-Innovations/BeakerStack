import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { connectionsGetStatus } from '../connectionsClient.js';
import { mapUnknownError, type ConnectionsError } from '../errors.js';
import type { ConnectionStatusRow } from '../schema.js';

export function useConnectionStatus(
  supabase: SupabaseClient,
  userId: string | null,
  otherUserId: string | null
) {
  const [status, setStatus] = useState<ConnectionStatusRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ConnectionsError | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !otherUserId) {
      setStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const row = await connectionsGetStatus(supabase, otherUserId);
      setStatus(row);
    } catch (e) {
      setError(mapUnknownError(e));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, otherUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}

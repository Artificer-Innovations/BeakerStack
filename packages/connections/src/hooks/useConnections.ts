import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { connectionsList } from '../connectionsClient.js';
import { mapUnknownError, type ConnectionsError } from '../errors.js';
import type { ConnectionListRow, StoredConnectionStatus } from '../schema.js';

export type UseConnectionsOptions = {
  supabase: SupabaseClient;
  userId: string | null;
  /** Pass a stable array reference (module constant or useMemo) to avoid extra refetches. */
  status?: (StoredConnectionStatus | 'expired_pending')[];
  /** Subscribe to bs_connections realtime (debounced). Default true. */
  enableRealtime?: boolean;
};

function statusFilterKey(status: UseConnectionsOptions['status']): string {
  if (status === undefined) return 'all';
  return status.slice().sort().join(',');
}

const REALTIME_DEBOUNCE_MS = 400;

function newRealtimeChannelInstanceId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

export function useConnections({
  supabase,
  userId,
  status,
  enableRealtime = true,
}: UseConnectionsOptions) {
  const [rows, setRows] = useState<ConnectionListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ConnectionsError | null>(null);

  /** Serialized filter — never use the status array reference in effect deps. */
  const statusDep = statusFilterKey(status);

  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;
  const statusRef = useRef(status);
  statusRef.current = status;
  const requestGenRef = useRef(0);
  const realtimeChannelIdRef = useRef<string | null>(null);
  if (!realtimeChannelIdRef.current) {
    realtimeChannelIdRef.current = newRealtimeChannelInstanceId();
  }

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!userId) {
        setRows([]);
        setLoading(false);
        setError(null);
        return;
      }
      const gen = ++requestGenRef.current;
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const currentStatus = statusRef.current;
        const data = await connectionsList(
          supabaseRef.current,
          currentStatus !== undefined ? { status: currentStatus } : undefined
        );
        if (gen !== requestGenRef.current) return;
        setRows(data);
      } catch (e) {
        if (gen !== requestGenRef.current) return;
        setError(mapUnknownError(e));
        setRows([]);
      } finally {
        if (gen === requestGenRef.current) {
          setLoading(false);
        }
      }
    },
    [userId, statusDep]
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void loadRef.current();
  }, [userId, statusDep]);

  useEffect(() => {
    if (
      !enableRealtime ||
      !userId ||
      typeof supabaseRef.current.channel !== 'function'
    ) {
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!cancelled) void loadRef.current({ silent: true });
      }, REALTIME_DEBOUNCE_MS);
    };

    const client = supabaseRef.current;
    const channelName = `bs_connections:${userId}:${realtimeChannelIdRef.current}`;
    const channel = client.channel(channelName);

    // StrictMode / remount: removeChannel is async; reusing a joined channel and
    // calling .on() after subscribe() throws (same guard as billing useUsage).
    if (channel.state === 'joined' || channel.state === 'joining') {
      return () => {
        void client.removeChannel(channel);
      };
    }

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bs_connections',
          filter: `recipient_user_id=eq.${userId}`,
        },
        scheduleReload
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bs_connections',
          filter: `initiator_user_id=eq.${userId}`,
        },
        scheduleReload
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      void client.removeChannel(channel);
    };
  }, [userId, enableRealtime]);

  const refresh = useCallback(() => loadRef.current(), [userId, statusDep]);

  return { rows, loading, error, refresh };
}

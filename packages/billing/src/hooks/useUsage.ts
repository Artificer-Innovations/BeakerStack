import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { InferMeterKeys } from '../schema.js';
import type { ProductBillingConfig } from '../schema.js';
import { useBillingContext } from './useBillingContext.js';

type RpcRow = {
  used: number;
  limit: number | null;
  remaining: number | null;
  periodEnd: string;
  periodStart: string;
};

export function useUsage<
  P extends ProductBillingConfig,
  K extends InferMeterKeys<P> & string,
>(
  meterKey: K
): {
  used: number;
  limit: number | null;
  remaining: number | null;
  resetsAt: string;
  exceeded: boolean;
  loading: boolean;
  error: BillingError | null;
  refresh: () => Promise<void>;
} {
  const { supabase, config, subscriptionLoading, userId } =
    useBillingContext<P>();
  const [snap, setSnap] = useState<RpcRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<BillingError | null>(null);
  const fetchUsageRef = useRef<() => Promise<void>>(async () => {});

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc(
        'billing_get_remaining_usage',
        {
          p_product_id: config.productId,
          p_event_type: meterKey,
        }
      );
      if (rpcErr) throw rpcErr;
      const j = data as Record<string, unknown> | null;
      if (j?.['error'] === 'unauthenticated') {
        setSnap(null);
        setError(mapUnknownError(new Error('unauthenticated')));
        return;
      }
      setSnap({
        used: Number(j?.['used'] ?? 0),
        limit:
          j?.['limit'] === null || typeof j?.['limit'] === 'undefined'
            ? null
            : Number(j['limit']),
        remaining:
          j?.['remaining'] === null || typeof j?.['remaining'] === 'undefined'
            ? null
            : Number(j['remaining']),
        periodEnd: String(j?.['periodEnd'] ?? ''),
        periodStart: String(j?.['periodStart'] ?? ''),
      });
    } catch (e) {
      setError(mapUnknownError(e));
      setSnap(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, config.productId, meterKey]);

  fetchUsageRef.current = fetchUsage;

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage, subscriptionLoading]);

  useEffect(() => {
    if (!userId || typeof supabase.channel !== 'function') return;
    const filter = `user_id=eq.${userId}`;
    const ch = supabase.channel(
      `billing_usage_aggregates:${config.productId}:${userId}:${meterKey}`
    );

    // Guard against StrictMode double-effect and remount races: if the channel
    // is already subscribed (removeChannel is async so cleanup may lag), skip
    // re-attaching handlers — adding .on() after subscribe() throws.
    if (ch.state === 'joined' || ch.state === 'joining') {
      return () => {
        void supabase.removeChannel(ch);
      };
    }

    ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'billing_usage_aggregates',
        filter,
      },
      payload => {
        const row = (payload.new ?? payload.old) as
          | { product_id?: string; event_type?: string }
          | undefined;
        if (
          row?.product_id === config.productId &&
          row?.event_type === meterKey
        ) {
          void fetchUsageRef.current();
        }
      }
    ).subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, config.productId, userId, meterKey]);

  const exceeded = useMemo(() => {
    if (!snap || snap.limit === null) return false;
    return snap.used >= snap.limit;
  }, [snap]);

  return useMemo(
    () => ({
      used: snap?.used ?? 0,
      limit: snap?.limit ?? null,
      remaining: snap?.remaining ?? null,
      resetsAt: snap?.periodEnd ?? '',
      exceeded,
      loading: loading || subscriptionLoading,
      error,
      refresh: fetchUsage,
    }),
    [snap, exceeded, loading, subscriptionLoading, error, fetchUsage]
  );
}

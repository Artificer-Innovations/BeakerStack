import { useCallback, useMemo, useState } from 'react';
import { mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { InferMeterKeys } from '../schema.js';
import type { ProductBillingConfig } from '../schema.js';
import { useBillingContext } from './useBillingContext.js';
import { useUsage } from './useUsage.js';

export function useRecordUsage<
  P extends ProductBillingConfig,
  K extends InferMeterKeys<P> & string,
>(
  meterKey: K
): {
  record: (
    quantity?: number,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  pending: boolean;
  error: BillingError | null;
  lastRecordedAt: number | null;
} {
  const { supabase, config } = useBillingContext<P>();
  const { refresh } = useUsage<P, K>(meterKey);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<BillingError | null>(null);
  const [lastRecordedAt, setLastRecordedAt] = useState<number | null>(null);

  const record = useCallback(
    async (quantity = 1, metadata?: Record<string, unknown>) => {
      setPending(true);
      setError(null);
      try {
        const meta = metadata ?? {};
        const { error: rpcErr } = await supabase.rpc(
          'billing_record_usage_event',
          {
            p_product_id: config.productId,
            p_event_type: meterKey,
            p_quantity: quantity,
            p_metadata: meta,
          }
        );
        if (rpcErr) throw rpcErr;
        setLastRecordedAt(Date.now());
        await refresh();
      } catch (e) {
        setError(mapUnknownError(e));
        await refresh();
      } finally {
        setPending(false);
      }
    },
    [supabase, config.productId, meterKey, refresh]
  );

  return useMemo(
    () => ({ record, pending, error, lastRecordedAt }),
    [record, pending, error, lastRecordedAt]
  );
}

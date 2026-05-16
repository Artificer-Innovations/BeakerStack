import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const PRODUCT_ID = 'beakerstack';

/**
 * Demo collections count and max item_count (from `billing_demo_get_collections`).
 * Mirrors web `useDemoCollectionCount` for billing usage/plans rows.
 */
export function useDemoCollectionCount() {
  const [count, setCount] = useState(0);
  const [maxItemsInAnyCollection, setMaxItemsInAnyCollection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'billing_demo_get_collections',
        {
          p_product_id: PRODUCT_ID,
        }
      );
      if (rpcError) throw rpcError;
      const rows = (data as { id: string; item_count: number }[] | null) ?? [];
      setCount(rows.length);
      setMaxItemsInAnyCollection(
        rows.length > 0
          ? Math.max(...rows.map(r => Number(r.item_count ?? 0)))
          : 0
      );
    } catch (e) {
      setError(
        e instanceof Error ? e : new Error('Failed to load collections')
      );
      setCount(0);
      setMaxItemsInAnyCollection(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    count,
    maxItemsInAnyCollection,
    loading,
    error,
    refresh,
  };
}

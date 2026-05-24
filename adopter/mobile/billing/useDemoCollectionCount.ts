import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../apps/mobile/src/lib/supabase';
import { appIdentity } from '@adopter/config/app-identity';

const PRODUCT_ID = appIdentity.productId;

export function useDemoCollectionCount() {
  const [count, setCount] = useState(0);
  const [maxItemsInAnyCollection, setMaxItemsInAnyCollection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc(
        'billing_demo_get_collections',
        { p_product_id: PRODUCT_ID }
      );
      if (rpcErr) throw rpcErr;
      const rows = (data as { id: string; item_count: number }[] | null) ?? [];
      setCount(rows.length);
      setMaxItemsInAnyCollection(
        rows.length > 0
          ? Math.max(...rows.map(r => Number(r.item_count ?? 0)))
          : 0
      );
    } catch (e) {
      setCount(0);
      setMaxItemsInAnyCollection(0);
      setError(e instanceof Error ? e.message : String(e));
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

import { useCallback, useEffect, useState } from 'react';
import { supabaseRpc } from '@/lib/supabase';
import { appIdentity } from '@adopter/config/app-identity';

const PRODUCT_ID = appIdentity.productId;

export function useDemoCollectionCount() {
  const [count, setCount] = useState(0);
  const [maxItemsInAnyCollection, setMaxItemsInAnyCollection] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseRpc.rpc(
        'billing_demo_get_collections',
        {
          p_product_id: PRODUCT_ID,
        }
      );
      if (error) throw error;
      const rows = (data as { id: string; item_count: number }[] | null) ?? [];
      setCount(rows.length);
      setMaxItemsInAnyCollection(
        rows.length > 0
          ? Math.max(...rows.map(r => Number(r.item_count ?? 0)))
          : 0
      );
    } catch {
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
    refresh,
  };
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../apps/mobile/src/lib/supabase';
import { appIdentity } from '@adopter/config/app-identity';

export type DemoCollectionRow = {
  id: string;
  item_count: number;
};

const PRODUCT_ID = appIdentity.productId;

export function useDemoCollections() {
  const [collections, setCollections] = useState<DemoCollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc(
        'billing_demo_get_collections',
        { p_product_id: PRODUCT_ID }
      );
      if (rpcErr) throw rpcErr;
      const rows = (data as { id: string; item_count: number }[] | null) ?? [];
      setCollections(
        rows.map(r => ({
          id: String(r.id),
          item_count: Number(r.item_count ?? 0),
        }))
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Could not load demo collections.';
      setError(msg);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCollections();
  }, [fetchCollections]);

  const addCollection = useCallback(async () => {
    const { error: rpcErr } = await supabase.rpc(
      'billing_demo_add_collection',
      { p_product_id: PRODUCT_ID }
    );
    if (rpcErr) throw rpcErr;
    await fetchCollections();
  }, [fetchCollections]);

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      const { error: rpcErr } = await supabase.rpc(
        'billing_demo_delete_collection',
        {
          p_product_id: PRODUCT_ID,
          p_collection_id: collectionId,
        }
      );
      if (rpcErr) throw rpcErr;
      await fetchCollections();
    },
    [fetchCollections]
  );

  const addItem = useCallback(
    async (collectionId: string) => {
      const { error: rpcErr } = await supabase.rpc('billing_demo_add_item', {
        p_product_id: PRODUCT_ID,
        p_collection_id: collectionId,
      });
      if (rpcErr) throw rpcErr;
      await fetchCollections();
    },
    [fetchCollections]
  );

  return {
    collections,
    loading,
    error,
    refresh: fetchCollections,
    addCollection,
    deleteCollection,
    addItem,
  };
}

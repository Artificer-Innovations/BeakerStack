import { useCallback, useEffect, useState } from 'react';
import { mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { ProductBillingConfig } from '../schema.js';
import type { BillingInvoiceRow } from '../types.js';
import { useBillingContext } from './useBillingContext.js';

/**
 * Paginated `billing_invoices` rows (client can SELECT own rows; webhook writes data).
 */
export function useInvoices<
  Config extends ProductBillingConfig = ProductBillingConfig,
>({
  pageSize = 20,
}: {
  pageSize?: number;
} = {}): {
  items: BillingInvoiceRow[];
  loading: boolean;
  error: BillingError | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { supabase, userId } = useBillingContext<Config>();
  const [items, setItems] = useState<BillingInvoiceRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<BillingError | null>(null);

  const loadPage = useCallback(
    async (start: number, append: boolean) => {
      if (!userId) {
        setItems([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      setError(null);
      if (!append) setLoading(true);
      try {
        const end = start + pageSize - 1;
        const { data, error: qErr } = await supabase
          .from('billing_invoices')
          .select('*')
          .order('created_at', { ascending: false })
          .range(start, end);
        if (qErr) throw qErr;
        const page = (data as BillingInvoiceRow[] | null) ?? [];
        setItems(prev => (append ? [...prev, ...page] : page));
        setOffset(start + page.length);
        setHasMore(page.length === pageSize);
      } catch (e) {
        setError(mapUnknownError(e));
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, pageSize]
  );

  useEffect(() => {
    setOffset(0);
    setItems([]);
    setHasMore(true);
    void loadPage(0, false);
  }, [loadPage, userId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadPage(offset, true);
  }, [hasMore, loading, loadPage, offset]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await loadPage(0, false);
  }, [loadPage]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

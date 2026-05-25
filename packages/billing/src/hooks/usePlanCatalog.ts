import { useCallback, useEffect, useMemo, useState } from 'react';
import { mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { ProductBillingConfig } from '../schema.js';
import type { Plan } from '../types.js';
import { useBillingContext } from './useBillingContext.js';

export function usePlanCatalog<
  P extends ProductBillingConfig = ProductBillingConfig,
>(): {
  plans: Plan[];
  loading: boolean;
  error: BillingError | null;
  refresh: () => Promise<void>;
} {
  const { supabase, config } = useBillingContext<P>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<BillingError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('product_id', config.productId)
        .eq('is_public', true)
        .order('display_order', { ascending: true });
      if (qErr) throw qErr;
      setPlans((data ?? []) as Plan[]);
    } catch (e) {
      setError(mapUnknownError(e));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, config.productId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({ plans, loading, error, refresh }),
    [plans, loading, error, refresh]
  );
}

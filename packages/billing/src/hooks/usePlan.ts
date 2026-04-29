import { useEffect, useMemo, useState } from 'react';
import { mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { ProductBillingConfig } from '../schema.js';
import type { Plan } from '../types.js';
import { useBillingContext } from './useBillingContext.js';

export function usePlan<
  P extends ProductBillingConfig = ProductBillingConfig,
>(): {
  data: Plan | null;
  loading: boolean;
  error: BillingError | null;
} {
  const { supabase, subscription, subscriptionLoading } =
    useBillingContext<P>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<BillingError | null>(null);

  useEffect(() => {
    if (subscriptionLoading) {
      setLoading(true);
      return;
    }
    if (!subscription?.plan_id) {
      setPlan(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from('billing_plans')
          .select('*')
          .eq('id', subscription.plan_id)
          .maybeSingle();
        if (qErr) throw qErr;
        if (!cancelled) {
          setPlan(
            data
              ? ({
                  ...data,
                  features: data.features as Plan['features'],
                } as Plan)
              : null
          );
        }
      } catch (e) {
        if (!cancelled) setError(mapUnknownError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, subscription?.plan_id, subscriptionLoading]);

  return useMemo(
    () => ({
      data: plan,
      loading: loading || subscriptionLoading,
      error,
    }),
    [plan, loading, subscriptionLoading, error]
  );
}

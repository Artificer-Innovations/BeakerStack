import { useMemo } from 'react';
import { readPlanFeatureValue } from '../featureAccess.js';
import type { InferFeatureKeys } from '../schema.js';
import type { ProductBillingConfig } from '../schema.js';
import { usePlan } from './usePlan.js';

export function useFeature<
  P extends ProductBillingConfig,
  K extends InferFeatureKeys<P> & string,
>(
  featureKey: K
): {
  enabled: boolean;
  value: boolean | number | null;
  loading: boolean;
  error: import('../errors.js').BillingError | null;
} {
  const { data: plan, loading, error } = usePlan<P>();
  return useMemo(() => {
    if (!plan) {
      return { enabled: false, value: null, loading, error };
    }
    const raw = readPlanFeatureValue(plan.features, featureKey as string);
    if (typeof raw === 'boolean') {
      return { enabled: raw, value: raw, loading, error };
    }
    if (typeof raw === 'number') {
      return { enabled: true, value: raw, loading, error };
    }
    return { enabled: false, value: null, loading, error };
  }, [plan, featureKey, loading, error]);
}

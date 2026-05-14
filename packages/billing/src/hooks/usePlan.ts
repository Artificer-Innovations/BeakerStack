import { useMemo } from 'react';
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
  const { plan, planLoading, planError } = useBillingContext<P>();
  return useMemo(
    () => ({ data: plan, loading: planLoading, error: planError }),
    [plan, planLoading, planError]
  );
}

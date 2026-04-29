import { useMemo } from 'react';
import { useBillingContext } from './useBillingContext.js';
import type { ProductBillingConfig } from '../schema.js';
import type { SubscriptionRow } from '../types.js';
import type { BillingError } from '../errors.js';

export function useSubscription<
  P extends ProductBillingConfig = ProductBillingConfig,
>(): {
  data: SubscriptionRow | null;
  loading: boolean;
  error: BillingError | null;
  refresh: () => Promise<void>;
} {
  const {
    subscription,
    subscriptionLoading,
    subscriptionError,
    refreshSubscription,
  } = useBillingContext<P>();
  return useMemo(
    () => ({
      data: subscription,
      loading: subscriptionLoading,
      error: subscriptionError,
      refresh: refreshSubscription,
    }),
    [subscription, subscriptionLoading, subscriptionError, refreshSubscription]
  );
}

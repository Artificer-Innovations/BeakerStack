import { useCallback, useMemo, useState } from 'react';
import { mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { ProductBillingConfig } from '../schema.js';
import { parseBillingFunctionError } from '../utils/parseBillingFunctionError.js';
import { useBillingContext } from './useBillingContext.js';

/**
 * Server-backed subscription mutations (Edge `billing-stripe` function).
 */
export function useBillingStripeActions<
  P extends ProductBillingConfig = ProductBillingConfig,
>(): {
  updateSubscription: (
    planId: string,
    cadence?: 'monthly' | 'annual'
  ) => Promise<boolean>;
  /** Sets `cancel_at_period_end` on the Stripe subscription (moves to free at period end). */
  scheduleCancelToFree: () => Promise<boolean>;
  /** Clears `cancel_at_period_end` on the Stripe subscription (reactivate before period end). */
  reactivateSubscription: () => Promise<boolean>;
  /** Cancels the Stripe subscription immediately (no period-end grace). */
  cancelSubscriptionImmediately: () => Promise<boolean>;
  pending: boolean;
  error: BillingError | null;
} {
  const { supabase, config, refreshSubscription, stripeFunctionName } =
    useBillingContext<P>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<BillingError | null>(null);

  const run = useCallback(
    async (body: Record<string, unknown>) => {
      setPending(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          stripeFunctionName,
          {
            body: {
              ...body,
              productId: config.productId,
            },
          }
        );
        if (fnErr) throw parseBillingFunctionError(data, fnErr);
        await refreshSubscription();
        setPending(false);
        return true;
      } catch (e) {
        setError(mapUnknownError(e));
        setPending(false);
        return false;
      }
    },
    [supabase, stripeFunctionName, config.productId, refreshSubscription]
  );

  const updateSubscription = useCallback(
    async (planId: string, cadence: 'monthly' | 'annual' = 'monthly') => {
      return run({
        action: 'update_subscription',
        planId,
        cadence,
      });
    },
    [run]
  );

  const scheduleCancelToFree = useCallback(async () => {
    return run({ action: 'schedule_cancel_to_free' });
  }, [run]);

  const reactivateSubscription = useCallback(async () => {
    return run({ action: 'resume_subscription' });
  }, [run]);

  const cancelSubscriptionImmediately = useCallback(async () => {
    return run({ action: 'cancel_immediately' });
  }, [run]);

  return useMemo(
    () => ({
      updateSubscription,
      scheduleCancelToFree,
      reactivateSubscription,
      cancelSubscriptionImmediately,
      pending,
      error,
    }),
    [
      updateSubscription,
      scheduleCancelToFree,
      reactivateSubscription,
      cancelSubscriptionImmediately,
      pending,
      error,
    ]
  );
}

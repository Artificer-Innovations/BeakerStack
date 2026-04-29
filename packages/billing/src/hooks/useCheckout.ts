import { useCallback, useMemo, useState } from 'react';
import { billingError, mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { ProductBillingConfig } from '../schema.js';
import { useBillingContext } from './useBillingContext.js';

export function useCheckout<
  P extends ProductBillingConfig = ProductBillingConfig,
>(): {
  startCheckout: (
    planId: string,
    cadence?: 'monthly' | 'annual',
    trialDays?: number
  ) => Promise<{ checkoutUrl: string } | null>;
  pending: boolean;
  error: BillingError | null;
} {
  const {
    supabase,
    config,
    checkoutSuccessUrl,
    checkoutCancelUrl,
    stripeFunctionName,
    refreshSubscription,
  } = useBillingContext<P>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<BillingError | null>(null);

  const startCheckout = useCallback(
    async (
      planId: string,
      cadence: 'monthly' | 'annual' = 'monthly',
      trialDays?: number
    ) => {
      setPending(true);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          action: 'checkout',
          productId: config.productId,
          planId,
          cadence,
          successUrl: checkoutSuccessUrl,
          cancelUrl: checkoutCancelUrl,
        };
        if (typeof trialDays === 'number' && !Number.isNaN(trialDays)) {
          body['trialDays'] = trialDays;
        }
        const { data, error: fnErr } = await supabase.functions.invoke(
          stripeFunctionName,
          { body }
        );
        if (fnErr) {
          throw fnErr;
        }
        const checkoutUrl = (data as { checkoutUrl?: string })?.checkoutUrl;
        if (!checkoutUrl) {
          throw billingError(
            'stripe',
            'Missing checkoutUrl from billing-stripe function'
          );
        }
        await refreshSubscription();
        return { checkoutUrl };
      } catch (e) {
        setError(mapUnknownError(e));
        return null;
      } finally {
        setPending(false);
      }
    },
    [
      supabase,
      stripeFunctionName,
      config.productId,
      checkoutSuccessUrl,
      checkoutCancelUrl,
      refreshSubscription,
    ]
  );

  return useMemo(
    () => ({ startCheckout, pending, error }),
    [startCheckout, pending, error]
  );
}

import { useCallback, useMemo, useState } from 'react';
import { billingError, mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { ProductBillingConfig } from '../schema.js';
import { parseBillingFunctionError } from '../utils/parseBillingFunctionError.js';
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
          throw parseBillingFunctionError(data, fnErr);
        }
        const checkoutUrl = (data as { checkoutUrl?: string })?.checkoutUrl;
        if (!checkoutUrl) {
          throw billingError(
            'stripe',
            'Missing checkoutUrl from billing-stripe function'
          );
        }
        setPending(false);
        return { checkoutUrl };
      } catch (e) {
        setError(mapUnknownError(e));
        setPending(false);
        return null;
      }
    },
    [
      supabase,
      stripeFunctionName,
      config.productId,
      checkoutSuccessUrl,
      checkoutCancelUrl,
    ]
  );

  return useMemo(
    () => ({ startCheckout, pending, error }),
    [startCheckout, pending, error]
  );
}

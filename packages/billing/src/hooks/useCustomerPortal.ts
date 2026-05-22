import { useCallback, useMemo, useState } from 'react';
import { billingError, mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';
import type { ProductBillingConfig } from '../schema.js';
import { parseBillingFunctionError } from '../utils/parseBillingFunctionError.js';
import { useBillingContext } from './useBillingContext.js';

export function useCustomerPortal<
  P extends ProductBillingConfig = ProductBillingConfig,
>(): {
  openPortal: () => Promise<string | null>;
  pending: boolean;
  error: BillingError | null;
} {
  const {
    supabase,
    config,
    portalReturnUrl,
    stripeFunctionName,
    refreshSubscription,
  } = useBillingContext<P>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<BillingError | null>(null);

  const openPortal = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        stripeFunctionName,
        {
          body: {
            action: 'portal',
            productId: config.productId,
            returnUrl: portalReturnUrl,
          },
        }
      );
      if (fnErr) throw parseBillingFunctionError(data, fnErr);
      const url = (data as { url?: string })?.url;
      if (!url) {
        throw billingError(
          'stripe',
          'Missing portal url from billing-stripe function'
        );
      }
      // Redirect immediately. A pre-navigation `refreshSubscription()` can block or fail
      // (slow / hung / RLS) and made the portal feel "broken" with no on-page error.
      // After the user returns to `portalReturnUrl`, BillingProvider reloads subscription.
      if (typeof window !== 'undefined' && window.location) {
        try {
          window.location.href = url;
        } catch {
          // jsdom throws "Not implemented: navigation" on full navigation; real browsers proceed.
        }
        setPending(false);
        return url;
      }
      await refreshSubscription();
      setPending(false);
      return url;
    } catch (e) {
      setError(mapUnknownError(e));
      setPending(false);
      return null;
    }
  }, [
    supabase,
    stripeFunctionName,
    config.productId,
    portalReturnUrl,
    refreshSubscription,
  ]);

  return useMemo(
    () => ({ openPortal, pending, error }),
    [openPortal, pending, error]
  );
}

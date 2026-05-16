import { openExternalUrl } from './openExternalUrl.native.js';

type StartCheckout = (
  planId: string,
  cadence?: 'monthly' | 'annual',
  trialDays?: number
) => Promise<{ checkoutUrl: string } | null>;

/**
 * Start Stripe Checkout via Edge Function, then open the session URL in the browser.
 */
export async function launchStripeCheckout(
  startCheckout: StartCheckout,
  planId: string,
  cadence: 'monthly' | 'annual' = 'monthly',
  trialDays?: number
): Promise<boolean> {
  const result = await startCheckout(planId, cadence, trialDays);
  if (!result?.checkoutUrl) return false;
  await openExternalUrl(result.checkoutUrl);
  return true;
}

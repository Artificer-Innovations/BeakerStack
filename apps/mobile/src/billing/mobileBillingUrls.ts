/**
 * Stripe return / portal URLs for the mobile dev client.
 * Centralized so one {@link BillingProvider} can wrap the whole navigator.
 */
export function getMobileBillingProviderUrls(): {
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
  portalReturnUrl: string;
} {
  const base =
    (typeof process !== 'undefined' &&
      process.env?.['EXPO_PUBLIC_BILLING_DEMO_BASE_URL']) ||
    'http://127.0.0.1:8081';
  return {
    checkoutSuccessUrl: `${base}/billing`,
    checkoutCancelUrl: `${base}/billing/plans?checkout=cancel`,
    portalReturnUrl: `${base}/billing`,
  };
}

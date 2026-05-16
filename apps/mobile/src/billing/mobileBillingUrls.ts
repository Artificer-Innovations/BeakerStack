/**
 * Stripe return / portal URLs for the mobile app.
 * Defaults to the Expo scheme (`beaker-stack://billing`) so hosted Supabase accepts
 * redirects without a LAN IP. Override with `EXPO_PUBLIC_BILLING_DEMO_BASE_URL` for
 * web-style paths (e.g. `http://192.168.x.x:8081` on a physical device).
 */
export function getMobileBillingProviderUrls(): {
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
  portalReturnUrl: string;
} {
  const base =
    (typeof process !== 'undefined' &&
      process.env?.['EXPO_PUBLIC_BILLING_DEMO_BASE_URL']) ||
    'beaker-stack://billing';
  const isDeepLink = base.includes('://') && !base.startsWith('http');
  if (isDeepLink) {
    return {
      checkoutSuccessUrl: `${base}?checkout=success`,
      checkoutCancelUrl: `${base}/plans?checkout=cancel`,
      portalReturnUrl: base,
    };
  }
  return {
    checkoutSuccessUrl: `${base}/billing?checkout=success`,
    checkoutCancelUrl: `${base}/billing/plans?checkout=cancel`,
    portalReturnUrl: `${base}/billing`,
  };
}

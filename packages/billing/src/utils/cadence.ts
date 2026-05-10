import type { Plan, SubscriptionRow } from '../types.js';

export type BillingCadence = 'monthly' | 'annual';

/**
 * Which Stripe price cadence the user is on, from subscription + plan price ids.
 */
export function resolveCadence(
  plan: Plan | null,
  sub: SubscriptionRow | null
): BillingCadence | null {
  if (!plan || !sub?.stripe_price_id) {
    return null;
  }
  if (sub.stripe_price_id === plan.stripe_price_id_monthly) {
    return 'monthly';
  }
  if (sub.stripe_price_id === plan.stripe_price_id_annual) {
    return 'annual';
  }
  return null;
}

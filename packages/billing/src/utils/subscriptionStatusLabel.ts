import type { SubscriptionRow } from '../types.js';

/**
 * Human-readable status label aligned with Stripe lifecycle semantics.
 */
export function subscriptionStatusLabel(
  sub: SubscriptionRow | null | undefined,
  periodEndLabel: string
): string {
  if (!sub?.status) return '—';
  if (
    sub.cancel_at_period_end &&
    (sub.status === 'active' || sub.status === 'trialing')
  ) {
    return `Cancelled - Subscription ends on ${periodEndLabel}`;
  }
  if (sub.status === 'active' || sub.status === 'trialing') {
    return `Active - Renews on ${periodEndLabel}`;
  }
  if (sub.status === 'free') {
    return 'Free';
  }
  if (sub.status === 'comped') {
    return 'Complimentary';
  }
  return sub.status;
}

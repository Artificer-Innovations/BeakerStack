import type { ReactElement } from 'react';
import type { SubscriptionRow } from '../types.js';

export type SubscriptionStatusBadgeProps = {
  subscription: SubscriptionRow | null;
  className?: string;
};

function periodEndLabel(sub: SubscriptionRow): string {
  if (!sub.current_period_end) return '—';
  return new Date(sub.current_period_end).toLocaleDateString();
}

/**
 * Compact pill for subscription state (active, trial, cancelling, past due, free).
 */
export function SubscriptionStatusBadge({
  subscription,
  className = '',
}: SubscriptionStatusBadgeProps): ReactElement | null {
  if (!subscription) return null;
  const st = subscription.status.toLowerCase();
  const end = periodEndLabel(subscription);

  let label = subscription.status;
  let classes =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ';

  if (st === 'free') {
    label = 'Free';
    classes += 'bg-gray-100 text-gray-800';
  } else if (st === 'past_due') {
    label = 'Payment failed';
    classes += 'bg-red-100 text-red-800';
  } else if (st === 'trialing') {
    label = 'Trial';
    classes += 'bg-blue-100 text-blue-800';
  } else if (subscription.cancel_at_period_end) {
    label = `Cancelling ${end}`;
    classes += 'bg-amber-100 text-amber-900';
  } else if (st === 'active' || st === 'paused' || st === 'unpaid') {
    label = 'Active';
    classes += 'bg-green-100 text-green-800';
  } else {
    classes += 'bg-gray-100 text-gray-800';
  }

  return (
    <span
      className={`${classes} ${className}`.trim()}
      data-testid='subscription-status-badge'
    >
      {label}
    </span>
  );
}

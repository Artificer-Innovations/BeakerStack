import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SubscriptionRow } from '../types.js';

export type SubscriptionStatusBadgeProps = {
  subscription: SubscriptionRow | null;
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
}: SubscriptionStatusBadgeProps): ReactElement | null {
  if (!subscription) return null;
  const st = subscription.status.toLowerCase();
  const end = periodEndLabel(subscription);

  let label = subscription.status;
  let bg = '#F3F4F6';
  let fg = '#1F2937';

  if (st === 'free') {
    label = 'Free';
  } else if (st === 'comped') {
    label = 'Complimentary';
    bg = '#E0E7FF';
    fg = '#3730A3';
  } else if (st === 'past_due') {
    label = 'Payment failed';
    bg = '#FEE2E2';
    fg = '#991B1B';
  } else if (st === 'trialing') {
    label = 'Trial';
    bg = '#DBEAFE';
    fg = '#1E3A8A';
  } else if (subscription.cancel_at_period_end) {
    label = `Cancelling ${end}`;
    bg = '#FEF3C7';
    fg = '#78350F';
  } else if (st === 'active' || st === 'paused' || st === 'unpaid') {
    label = 'Active';
    bg = '#D1FAE5';
    fg = '#065F46';
  }

  return (
    <View
      style={[styles.pill, { backgroundColor: bg }]}
      accessibilityLabel={label}
    >
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 12, fontWeight: '600' },
});

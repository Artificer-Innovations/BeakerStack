import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePlan } from '../hooks/usePlan.js';
import { useSubscription } from '../hooks/useSubscription.js';
import type { ProductBillingConfig } from '../schema.js';
import { subscriptionStatusLabel } from '../utils/subscriptionStatusLabel.js';
import type { SubscriptionStatusProps } from './SubscriptionStatus.types.js';

export function SubscriptionStatus<P extends ProductBillingConfig>({
  style,
}: SubscriptionStatusProps): ReactElement {
  const { data: sub, loading } = useSubscription<P>();
  const { data: plan } = usePlan<P>();

  if (loading) {
    return (
      <View style={style}>
        <Text>…</Text>
      </View>
    );
  }

  const renewal = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString()
    : '—';

  return (
    <View style={style}>
      <Text style={styles.line}>
        Plan: {plan?.display_name ?? sub?.plan_id ?? '—'}
      </Text>
      <Text style={styles.line}>
        Status: {subscriptionStatusLabel(sub, renewal)}
      </Text>
      {sub?.status === 'past_due' ? (
        <Text style={styles.warn}>
          Payment issue — update billing in the portal.
        </Text>
      ) : null}
      <Text style={styles.line}>Renews / period ends: {renewal}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { marginBottom: 4 },
  warn: { color: '#92400e', marginBottom: 4 },
});

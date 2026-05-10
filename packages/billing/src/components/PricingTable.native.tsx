import type { ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlan } from '../hooks/usePlan.js';
import { usePlanCatalog } from '../hooks/usePlanCatalog.js';
import type { ProductBillingConfig } from '../schema.js';
import type { PricingTableProps } from './PricingTable.types.js';

export function PricingTable<P extends ProductBillingConfig>({
  onSelectPlan,
  onCheckout,
  highlightCurrent,
  highlightPlanId,
  productId: _productId,
  currentUserId: _currentUserId,
  style,
}: PricingTableProps): ReactElement {
  void _productId;
  void _currentUserId;
  const onPlanChosen = onCheckout ?? onSelectPlan;
  const { plans, loading } = usePlanCatalog<P>();
  const { data: currentPlan } = usePlan<P>();

  if (loading) {
    return (
      <View style={style}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={style}
      data={plans}
      keyExtractor={item => item.id}
      renderItem={({ item: p }) => {
        const isCurrent =
          (highlightCurrent && currentPlan?.id === p.id) ||
          (highlightPlanId != null &&
            highlightPlanId !== '' &&
            p.id === highlightPlanId);
        return (
          <View style={[styles.card, isCurrent && styles.cardHighlight]}>
            <Text style={styles.title}>{p.display_name}</Text>
            <Text>
              {(p.price_cents / 100).toFixed(2)} USD / {p.billing_period}
            </Text>
            {p.price_cents > 0 && p.trial_period_days > 0 ? (
              <Text style={styles.trialNote}>
                {p.trial_period_days}-day trial on checkout
              </Text>
            ) : null}
            {onPlanChosen ? (
              <Pressable onPress={() => onPlanChosen(p.id)} style={styles.btn}>
                <Text>Select</Text>
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  cardHighlight: { borderColor: '#3b82f6', borderWidth: 2 },
  title: { fontWeight: '700' },
  btn: { marginTop: 8 },
  trialNote: { fontSize: 12, color: '#4b5563', marginTop: 4 },
});

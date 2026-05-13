import {
  CustomerPortalLink,
  SubscriptionStatus,
  SubscriptionStatusBadge,
  UsageIndicator,
} from '@beakerstack/billing/native';
import { useSubscription, usePlan } from '@beakerstack/billing';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';

export function BillingOverviewScreen(): ReactElement {
  const {
    data: sub,
    loading,
    error,
    refresh,
  } = useSubscription<typeof beakerstackBillingConfig>();
  usePlan<typeof beakerstackBillingConfig>(); // keep plan cache warm

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color='#4f46e5' />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{error.message}</Text>
        <Pressable onPress={() => void refresh()} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const downgradeScheduled =
    sub?.cancel_at_period_end || sub?.pending_target_plan_id;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <Text style={s.sectionLabel}>Current plan</Text>
          <SubscriptionStatus<typeof beakerstackBillingConfig> />
          <View style={s.badgeRow}>
            <SubscriptionStatusBadge subscription={sub} />
          </View>
        </View>

        {downgradeScheduled && periodEnd ? (
          <View style={[s.card, s.warningCard]}>
            <Text style={s.warningText}>
              {sub?.cancel_at_period_end
                ? `Your plan will be cancelled on ${periodEnd}.`
                : `Downgrade scheduled for ${periodEnd}.`}
            </Text>
          </View>
        ) : periodEnd ? (
          <View style={s.card}>
            <Text style={s.meta}>Next renewal: {periodEnd}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.sectionLabel}>Usage this period</Text>
          <UsageIndicator<typeof beakerstackBillingConfig>
            meter={BEAKERSTACK_METER_AI_SUMMARIZE}
            variant='expanded'
          />
        </View>

        <View style={s.card}>
          <CustomerPortalLink<typeof beakerstackBillingConfig>
            style={s.portalLink}
          >
            <Text style={s.portalLinkText}>Manage billing →</Text>
          </CustomerPortalLink>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  badgeRow: { marginTop: 8 },
  meta: { fontSize: 14, color: '#6b7280' },
  warningText: { fontSize: 14, color: '#92400e', lineHeight: 20 },
  portalLink: { alignSelf: 'flex-start' },
  portalLinkText: { fontSize: 15, color: '#4f46e5', fontWeight: '600' },
  errorText: { color: '#b91c1c', marginBottom: 12, textAlign: 'center' },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  retryText: { color: '#4f46e5', fontWeight: '600' },
});

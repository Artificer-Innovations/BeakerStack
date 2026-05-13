import * as WebBrowser from 'expo-web-browser';
import {
  usePlanCatalog,
  useSubscription,
  useCheckout,
  useBillingStripeActions,
  usePlan,
} from '@beakerstack/billing';
import { PricingTable } from '@beakerstack/billing/native';
import { ConfirmDowngradeModal } from '@beakerstack/billing/native';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';
import type { Plan } from '@beakerstack/billing';

const appScheme =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_SCHEME) ||
  'exp';
const checkoutRedirectUrl = `${appScheme}://billing`;

export function BillingPlansScreen(): ReactElement {
  const {
    plans,
    loading: catalogLoading,
    error: catalogError,
    refresh: refreshCatalog,
  } = usePlanCatalog<typeof beakerstackBillingConfig>();
  const {
    data: sub,
    loading: subLoading,
    refresh: refreshSub,
  } = useSubscription<typeof beakerstackBillingConfig>();
  const { data: currentPlan } = usePlan<typeof beakerstackBillingConfig>();
  const { startCheckout, pending: checkoutPending } =
    useCheckout<typeof beakerstackBillingConfig>();
  const {
    scheduleCancelToFree,
    updateSubscription,
    pending: actionPending,
  } = useBillingStripeActions<typeof beakerstackBillingConfig>();

  const [cadence, setCadence] = useState<'monthly' | 'annual'>('monthly');
  const [confirmTarget, setConfirmTarget] = useState<Plan | null>(null);
  const [downgradeAction, setDowngradeAction] = useState<
    'cancel' | 'update' | null
  >(null);

  // Refresh subscription when user returns from Stripe checkout
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        void refreshSub();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [refreshSub]);

  const handleSelectPlan = useCallback(
    async (planId: string) => {
      const target = plans.find(p => p.id === planId);
      if (!target) return;

      const currentOrder = currentPlan?.display_order ?? 0;
      const targetOrder = target.display_order ?? 0;
      const isDowngrade = targetOrder < currentOrder;
      const isFreeDowngrade = target.price_cents === 0;

      if (isDowngrade) {
        setConfirmTarget(target);
        setDowngradeAction(isFreeDowngrade ? 'cancel' : 'update');
        return;
      }

      // Upgrade — open Stripe checkout
      const result = await startCheckout(planId, cadence);
      if (result?.checkoutUrl) {
        await WebBrowser.openAuthSessionAsync(
          result.checkoutUrl,
          checkoutRedirectUrl
        );
      }
    },
    [plans, currentPlan, startCheckout, cadence]
  );

  const handleConfirmDowngrade = useCallback(async () => {
    if (!confirmTarget) return;
    if (downgradeAction === 'cancel') {
      await scheduleCancelToFree();
    } else {
      await updateSubscription(confirmTarget.id, cadence);
    }
    setConfirmTarget(null);
    setDowngradeAction(null);
  }, [
    confirmTarget,
    downgradeAction,
    scheduleCancelToFree,
    updateSubscription,
    cadence,
  ]);

  const loading = catalogLoading || subLoading;

  if (loading && plans.length === 0) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color='#4f46e5' />
      </View>
    );
  }

  if (catalogError && plans.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{catalogError.message}</Text>
        <Pressable onPress={() => void refreshCatalog()} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.cadenceToggle}>
          {(['monthly', 'annual'] as const).map(c => (
            <Pressable
              key={c}
              style={[s.cadenceBtn, cadence === c && s.cadenceBtnActive]}
              onPress={() => setCadence(c)}
            >
              <Text
                style={[
                  s.cadenceBtnText,
                  cadence === c && s.cadenceBtnTextActive,
                ]}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
                {c === 'annual' ? ' · Save 20%' : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        <PricingTable<typeof beakerstackBillingConfig>
          highlightPlanId={sub?.plan_id ?? null}
          onCheckout={planId => void handleSelectPlan(planId)}
        />

        {checkoutPending || actionPending ? (
          <View style={s.pendingBar}>
            <ActivityIndicator color='#4f46e5' size='small' />
            <Text style={s.pendingText}>Processing…</Text>
          </View>
        ) : null}
      </ScrollView>

      {confirmTarget ? (
        <ConfirmDowngradeModal
          visible
          targetPlan={confirmTarget}
          currentPlan={currentPlan}
          onConfirm={() => void handleConfirmDowngrade()}
          onCancel={() => {
            setConfirmTarget(null);
            setDowngradeAction(null);
          }}
          pending={actionPending}
        />
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cadenceToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  cadenceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  cadenceBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  cadenceBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  cadenceBtnTextActive: { color: '#111827', fontWeight: '600' },
  pendingBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  pendingText: { color: '#6b7280', fontSize: 14 },
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

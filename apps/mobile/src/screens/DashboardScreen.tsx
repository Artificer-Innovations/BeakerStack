import React, {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBillingContext, usePlan, useUsage } from '@beakerstack/billing';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.native';
import { supabase } from '../lib/supabase';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../billing/beakerstackBillingConfig';
import { useDemoCollections } from '../billing/useDemoCollections';
import {
  AnnotatedPrimitive,
  BooleanFeatureTiles,
  CollectionDetail,
  CollectionsGrid,
  FeatureGateCard,
  UsageStrip,
} from '../components/dashboard';

function readBillingDashboardDemoMode(): boolean {
  return process.env?.['EXPO_PUBLIC_BILLING_DEMO_MODE'] === 'true';
}

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Billing: undefined;
};

type DashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Dashboard'
>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

const PLANS = [
  { id: 'beakerstack_free' as const, label: 'Free' },
  { id: 'beakerstack_pro' as const, label: 'Pro' },
  { id: 'beakerstack_max' as const, label: 'Max' },
] as const;

const METERS = [BEAKERSTACK_METER_AI_SUMMARIZE] as const;

function DemoControlsBlock(): ReactElement | null {
  if (!readBillingDashboardDemoMode()) return null;
  const { data: plan, loading: planLoading } =
    usePlan<typeof beakerstackBillingConfig>();
  const { refreshSubscription } =
    useBillingContext<typeof beakerstackBillingConfig>();
  const { refresh: refreshUsage } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);
  const [pending, setPending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = useCallback(async (k: string, fn: () => Promise<void>) => {
    setMsg(null);
    setPending(k);
    try {
      await fn();
      setMsg('Done.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(null);
    }
  }, []);

  return (
    <View style={[styles.demoCard, styles.cardDemo]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Demo mode only</Text>
      </View>
      <Text style={styles.demoTitle}>Demo controls</Text>
      <Text style={styles.demonstratesLabel}>
        DEMONSTRATES:{' '}
        <Text style={styles.demonstratesMono}>
          billing_demo_simulate_upgrade, billing_demo_reset_usage
        </Text>
      </Text>
      <Text style={styles.demoDesc}>
        App-layer only. Not part of @beakerstack/billing. Remove in production.
      </Text>
      <View style={styles.demoBody}>
        <Text style={styles.bodyText}>
          Current plan: {planLoading ? '…' : (plan?.display_name ?? '—')}
        </Text>
        <View style={styles.btnRow}>
          {PLANS.map(p => (
            <Pressable
              key={p.id}
              style={[
                styles.btnSecondary,
                (plan?.id === p.id || pending != null) && styles.btnDisabled,
              ]}
              disabled={plan?.id === p.id || pending != null}
              onPress={() =>
                void run(`p-${p.id}`, async () => {
                  const { error: e } = await supabase.rpc(
                    'billing_demo_simulate_upgrade',
                    {
                      p_product_id: beakerstackBillingConfig.productId,
                      p_plan_id: p.id,
                    }
                  );
                  if (e) throw e;
                  await refreshSubscription();
                })
              }
            >
              <Text style={styles.btnSecondaryText}>
                {pending === `p-${p.id}` ? '…' : `To ${p.label}`}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[
            styles.btnSecondary,
            { marginTop: 8 },
            pending != null && styles.btnDisabled,
          ]}
          disabled={pending != null}
          onPress={() =>
            void run('reset', async () => {
              for (const m of METERS) {
                const { error: e } = await supabase.rpc(
                  'billing_demo_reset_usage',
                  {
                    p_product_id: beakerstackBillingConfig.productId,
                    p_event_type: m,
                  }
                );
                if (e) throw e;
              }
              await refreshUsage();
            })
          }
        >
          <Text style={styles.btnSecondaryText}>
            {pending === 'reset' ? '…' : 'Reset all usage counters'}
          </Text>
        </Pressable>
        {msg ? <Text style={styles.muted}>{msg}</Text> : null}
        <Text style={styles.tinyLegal}>
          These actions bypass Stripe. Do not deploy to production.
        </Text>
      </View>
      <Text style={styles.codeLine}>
        // supabase.rpc(&quot;billing_demo_simulate_upgrade&quot;, …)
      </Text>
    </View>
  );
}

function DashboardBody({
  navigation,
}: {
  navigation: DashboardScreenNavigationProp;
}): ReactElement {
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);

  const {
    collections,
    loading: collectionsLoading,
    error: collectionsError,
    addCollection,
    deleteCollection,
    addItem,
  } = useDemoCollections();

  useEffect(() => {
    if (collections.length === 0) {
      setSelectedCollectionId(null);
      return;
    }
    if (selectedCollectionId === null) {
      setSelectedCollectionId(collections[0].id);
      return;
    }
    if (!collections.find(c => c.id === selectedCollectionId)) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  const selectedCollection = collections.find(
    c => c.id === selectedCollectionId
  );

  const onNavigateBilling = useCallback(() => {
    navigation.navigate('Billing');
  }, [navigation]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps='handled'
    >
      <AnnotatedPrimitive
        tag='useUsage("ai_summarize")'
        variant='usage'
        tooltip='Meter reads from useUsage; the Simulate button records usage via billing_record_usage_event.'
      >
        <UsageStrip onNavigateBilling={onNavigateBilling} />
      </AnnotatedPrimitive>

      <AnnotatedPrimitive
        tag='FeatureGate + useFeature("feature_a")'
        variant='gate'
        tooltip='When useFeature("feature_a").enabled is false, FeatureGate renders the fallback; when true, children render.'
      >
        <FeatureGateCard onNavigateBilling={onNavigateBilling} />
      </AnnotatedPrimitive>

      <AnnotatedPrimitive
        tag='useFeature("containers_per_account_max")'
        variant='feature'
        tooltip='Numeric cap from useFeature; New collection enforces containers_per_account_max.'
      >
        <CollectionsGrid
          collections={collections}
          loading={collectionsLoading}
          error={collectionsError}
          selectedId={selectedCollectionId}
          onSelect={setSelectedCollectionId}
          addCollection={addCollection}
          deleteCollection={deleteCollection}
        />
      </AnnotatedPrimitive>

      <AnnotatedPrimitive
        tag='useFeature("items_per_container_max")'
        variant='feature'
        tooltip='Per-collection item cap from useFeature; add-item enforces items_per_container_max.'
      >
        <CollectionDetail collection={selectedCollection} addItem={addItem} />
      </AnnotatedPrimitive>

      <AnnotatedPrimitive
        tag='useFeature("feature_a") · useFeature("feature_b")'
        variant='feature'
        tooltip='Boolean features reflect plan config; enabled/disabled state changes with the active plan.'
      >
        <BooleanFeatureTiles />
      </AnnotatedPrimitive>

      <DemoControlsBlock />
    </ScrollView>
  );
}

export default function DashboardScreen({ navigation }: Props) {
  const auth = useAuthContext();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      const t = setTimeout(() => navigation.replace('Home'), 100);
      return () => clearTimeout(t);
    }
  }, [auth.loading, auth.user, navigation]);

  if (auth.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#4F46E5' />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!auth.user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#4F46E5' />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader supabaseClient={supabase} />
      <DashboardBody navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxWidth: 1024,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  demoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 8,
  },
  cardDemo: { borderStyle: 'dashed', borderColor: '#d1d5db' },
  badge: {
    position: 'absolute',
    right: 12,
    top: 10,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#92400e' },
  demoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    paddingRight: 100,
  },
  demonstratesLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demonstratesMono: { fontFamily: 'monospace', fontSize: 12, color: '#374151' },
  demoDesc: { marginTop: 6, fontSize: 14, color: '#4b5563' },
  demoBody: { marginTop: 12 },
  bodyText: { fontSize: 14, color: '#374151' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  btnSecondaryText: { color: '#374151', fontSize: 12, fontWeight: '500' },
  btnDisabled: { opacity: 0.5 },
  muted: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  tinyLegal: { fontSize: 10, color: '#6b7280', marginTop: 8 },
  codeLine: {
    marginTop: 12,
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#6b7280',
  },
});

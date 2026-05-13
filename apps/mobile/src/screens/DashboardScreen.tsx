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
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BillingProvider,
  mapUnknownError,
  useBillingContext,
  useFeature,
  usePlan,
  useUsage,
} from '@beakerstack/billing';
import type { BillingError } from '@beakerstack/billing';
import { FeatureGate } from '@beakerstack/billing/native';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.native';
import { useDarkMode } from '@beakerstack/shared';
import type { ThemeColors } from '@beakerstack/shared';
import { supabase } from '../lib/supabase';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../billing/beakerstackBillingConfig';
import { useDemoCollections } from '../billing/useDemoCollections';
import { nextFakeAiSummary } from '../lib/fakeAi';

// Read at call time (not module init) so tests and dev toggles can change process.env without reload.
function readBillingDashboardDemoMode(): boolean {
  return process.env?.['EXPO_PUBLIC_BILLING_DEMO_MODE'] === 'true';
}

function readDemoUseRealAi(): boolean {
  return process.env?.['EXPO_PUBLIC_DEMO_USE_REAL_AI'] === 'true';
}

const billingBaseUrl =
  (typeof process !== 'undefined' &&
    process.env?.['EXPO_PUBLIC_BILLING_DEMO_BASE_URL']) ||
  'http://127.0.0.1:8081';

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

type SummaryEntry = { id: string; at: number; text: string };

function limLabel(v: number | null): string {
  if (v === null) return '…';
  if (v === -1) return '∞';
  return String(v);
}

function SectionCard(props: {
  title: string;
  demonstrates: string;
  description: string;
  codeRef: string;
  demoMode?: boolean;
  colors: ThemeColors;
  children: React.ReactNode;
}): ReactElement {
  const { colors } = props;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        props.demoMode && styles.cardDemo,
      ]}
    >
      {props.demoMode && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Demo mode only</Text>
        </View>
      )}
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
        {props.title}
      </Text>
      <Text style={[styles.demonstratesLabel, { color: colors.textSecondary }]}>
        DEMONSTRATES:{' '}
        <Text style={[styles.demonstratesMono, { color: colors.textPrimary }]}>
          {props.demonstrates}
        </Text>
      </Text>
      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
        {props.description}
      </Text>
      <View style={styles.cardBody}>{props.children}</View>
      <Text style={[styles.codeLine, { color: colors.textSecondary }]}>
        // {props.codeRef}
      </Text>
    </View>
  );
}

function MeteredBlock({ colors }: { colors: ThemeColors }): ReactElement {
  const { config } = useBillingContext<typeof beakerstackBillingConfig>();
  const {
    used,
    limit,
    resetsAt,
    exceeded,
    loading,
    error: usageError,
    refresh,
  } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);
  const [results, setResults] = useState<SummaryEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [recordError, setRecordError] = useState<BillingError | null>(null);

  const resolveSummaryText = useCallback(async (): Promise<string> => {
    if (readDemoUseRealAi()) {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          'demo-ai-summarize',
          {
            body: {
              prompt: 'Write a short lorem-style summary (3-5 lines).',
            },
          }
        );
        if (!fnErr) {
          const t = (data as { text?: string } | null)?.text;
          if (typeof t === 'string' && t.trim()) return t.trim();
        }
      } catch {
        /* optional demo-ai edge unavailable */
      }
    }
    return nextFakeAiSummary();
  }, []);

  const pushResult = useCallback((text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setResults(prev => {
      const next: SummaryEntry[] = [{ id, at: Date.now(), text }, ...prev];
      return next.slice(0, 3);
    });
  }, []);

  const onSimulate = useCallback(async () => {
    if (exceeded || pending) return;
    const summaryText = await resolveSummaryText();
    setPending(true);
    setRecordError(null);
    try {
      const { error: rpcErr } = await supabase.rpc(
        'billing_record_usage_event',
        {
          p_product_id: config.productId,
          p_event_type: BEAKERSTACK_METER_AI_SUMMARIZE,
          p_quantity: 1,
          p_metadata: {},
        }
      );
      if (rpcErr) throw rpcErr;
      await refresh();
      pushResult(summaryText);
    } catch (e) {
      setRecordError(mapUnknownError(e));
    } finally {
      setPending(false);
    }
  }, [
    exceeded,
    pending,
    config.productId,
    refresh,
    resolveSummaryText,
    pushResult,
  ]);

  const lim = limit === null ? '∞' : String(limit);
  const capLine =
    limit === null
      ? `${used} used this period · unlimited`
      : `${used} of ${lim} used · resets ${
          resetsAt ? new Date(resetsAt).toLocaleDateString() : '—'
        }`;
  const pct =
    limit != null && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const displayError = recordError ?? usageError;

  return (
    <View>
      <View testID='usage-indicator-expanded'>
        {limit != null && (
          <View
            style={[styles.usageBarTrack, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.usageBarFill,
                { width: `${pct}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
        )}
        <Text style={[styles.usageCapLine, { color: colors.textSecondary }]}>
          {loading ? '…' : capLine}
        </Text>
      </View>
      <View style={styles.row}>
        {exceeded ? (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Limit reached — open Billing for plans.
          </Text>
        ) : (
          <Pressable
            style={[
              styles.btnPrimary,
              { backgroundColor: colors.accent },
              pending && styles.btnDisabled,
            ]}
            disabled={pending}
            onPress={() => void onSimulate()}
          >
            <Text style={styles.btnPrimaryText}>
              {pending ? '…' : 'Simulate AI summarize'}
            </Text>
          </Pressable>
        )}
      </View>
      {displayError ? (
        <Text style={styles.errText}>{displayError.message}</Text>
      ) : null}
      <View
        style={[
          styles.resultBox,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        {results.length === 0 ? (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Tap &apos;Simulate AI summarize&apos; to generate a result.
          </Text>
        ) : (
          results.map(e => (
            <View
              key={e.id}
              style={[styles.resultItem, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.resultTs, { color: colors.textSecondary }]}>
                {new Date(e.at).toLocaleString()}
              </Text>
              <Text style={[styles.resultBody, { color: colors.textPrimary }]}>
                {e.text}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function NumericCapsBlock({ colors }: { colors: ThemeColors }): ReactElement {
  const {
    collections,
    loading,
    error,
    addCollection,
    deleteCollection,
    addItem,
  } = useDemoCollections();
  const { value: maxCollectionsRaw, loading: l1 } = useFeature<
    typeof beakerstackBillingConfig,
    'containers_per_account_max'
  >('containers_per_account_max');
  const { value: maxItemsRaw, loading: l2 } = useFeature<
    typeof beakerstackBillingConfig,
    'items_per_container_max'
  >('items_per_container_max');
  const maxCollections =
    typeof maxCollectionsRaw === 'number' ? maxCollectionsRaw : null;
  const maxItemsPer = typeof maxItemsRaw === 'number' ? maxItemsRaw : null;
  const count = collections.length;
  const atCollectionCap =
    maxCollections !== null && maxCollections !== -1 && count >= maxCollections;
  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const wrap = useCallback(async (key: string, fn: () => Promise<void>) => {
    setActionErr(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }, []);
  const featLoading = l1 || l2;

  return (
    <View>
      {error ? (
        <Text style={styles.warnText}>
          {error} (needs demo_billing_mode in DB)
        </Text>
      ) : null}
      <View style={styles.rowBetween}>
        <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
          Collections:{' '}
          {loading || featLoading
            ? '…'
            : `${count} of ${limLabel(maxCollections)}`}
        </Text>
        <Pressable
          style={[
            styles.btnPrimary,
            { backgroundColor: colors.accent },
            (atCollectionCap || busy === 'add') && styles.btnDisabled,
          ]}
          disabled={atCollectionCap || loading || featLoading || busy === 'add'}
          onPress={() => void wrap('add', addCollection)}
        >
          <Text style={styles.btnPrimaryText}>
            {busy === 'add'
              ? '…'
              : atCollectionCap
                ? 'Limit reached'
                : 'Add collection'}
          </Text>
        </Pressable>
      </View>
      {actionErr ? <Text style={styles.errText}>{actionErr}</Text> : null}
      {!loading && collections.length === 0 ? (
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          No collections yet. Tap Add collection to start.
        </Text>
      ) : (
        collections.map(row => {
          const itemCap =
            maxItemsPer !== null &&
            maxItemsPer !== -1 &&
            row.item_count >= maxItemsPer;
          return (
            <View
              key={row.id}
              style={[
                styles.collectionCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.monoSm, { color: colors.textSecondary }]}>
                {row.id.slice(0, 8)}…
              </Text>
              <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
                Items: {row.item_count} of {limLabel(maxItemsPer)}
              </Text>
              <View style={styles.row}>
                <Pressable
                  style={[
                    styles.btnSecondary,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  disabled={itemCap || busy === `i-${row.id}`}
                  onPress={() =>
                    void wrap(`i-${row.id}`, () => addItem(row.id))
                  }
                >
                  <Text
                    style={[
                      styles.btnSecondaryText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {itemCap
                      ? 'Limit'
                      : busy === `i-${row.id}`
                        ? '…'
                        : 'Add item'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.btnDanger}
                  onPress={() =>
                    void wrap(`d-${row.id}`, () => deleteCollection(row.id))
                  }
                >
                  <Text style={styles.btnDangerText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function BooleanGatesBlock({ colors }: { colors: ThemeColors }): ReactElement {
  const { loading: planLoading } = usePlan<typeof beakerstackBillingConfig>();
  const a = useFeature<typeof beakerstackBillingConfig, 'feature_a'>(
    'feature_a'
  );
  const b = useFeature<typeof beakerstackBillingConfig, 'feature_b'>(
    'feature_b'
  );
  return (
    <View>
      <Text style={[styles.subH, { color: colors.textPrimary }]}>
        Feature A (requires Pro)
      </Text>
      {planLoading ? (
        <Text style={[styles.muted, { color: colors.textSecondary }]}>…</Text>
      ) : (
        <FeatureGate<typeof beakerstackBillingConfig>
          feature='feature_a'
          fallback={
            <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
              Feature A requires Pro. See Billing for plans.
            </Text>
          }
        >
          <Text style={styles.okText}>
            ✓ Feature A is enabled for your plan.
          </Text>
        </FeatureGate>
      )}
      <Text
        style={[styles.subH, { color: colors.textPrimary, marginTop: 12 }]}
      >
        Feature B (requires Max)
      </Text>
      {planLoading ? (
        <Text style={[styles.muted, { color: colors.textSecondary }]}>…</Text>
      ) : (
        <FeatureGate<typeof beakerstackBillingConfig>
          feature='feature_b'
          fallback={
            <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
              Feature B requires Max. See Billing for plans.
            </Text>
          }
        >
          <Text style={styles.okText}>
            ✓ Feature B is enabled for your plan.
          </Text>
        </FeatureGate>
      )}
      <Text
        style={[styles.bodyText, { color: colors.textPrimary, marginTop: 12 }]}
      >
        useFeature(&quot;feature_a&quot;) →{' '}
        {a.loading ? '…' : String(a.enabled)} · feature_b →{' '}
        {b.loading ? '…' : String(b.enabled)}
      </Text>
    </View>
  );
}

const PLANS = [
  { id: 'beakerstack_free' as const, label: 'Free' },
  { id: 'beakerstack_pro' as const, label: 'Pro' },
  { id: 'beakerstack_max' as const, label: 'Max' },
] as const;

const METERS = [BEAKERSTACK_METER_AI_SUMMARIZE] as const;

function DemoControlsBlock({
  colors,
}: {
  colors: ThemeColors;
}): ReactElement | null {
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
    <SectionCard
      title='Demo controls'
      demonstrates='billing_demo_simulate_upgrade, billing_demo_reset_usage'
      description='App-layer only. Not part of @beakerstack/billing. Remove in production.'
      codeRef='supabase.rpc("billing_demo_simulate_upgrade", …)'
      demoMode
      colors={colors}
    >
      <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
        Current plan: {planLoading ? '…' : (plan?.display_name ?? '—')}
      </Text>
      <View style={styles.btnRow}>
        {PLANS.map(p => (
          <Pressable
            key={p.id}
            style={[
              styles.btnSecondary,
              { borderColor: colors.border, backgroundColor: colors.surface },
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
            <Text
              style={[styles.btnSecondaryText, { color: colors.textPrimary }]}
            >
              {pending === `p-${p.id}` ? '…' : `To ${p.label}`}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[
          styles.btnSecondary,
          {
            marginTop: 8,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
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
        <Text style={[styles.btnSecondaryText, { color: colors.textPrimary }]}>
          {pending === 'reset' ? '…' : 'Reset all usage counters'}
        </Text>
      </Pressable>
      {msg ? (
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          {msg}
        </Text>
      ) : null}
      <Text style={[styles.tinyLegal, { color: colors.textSecondary }]}>
        These actions bypass Stripe. Do not deploy to production.
      </Text>
    </SectionCard>
  );
}

function DashboardBody({
  navigation,
  colors,
}: {
  navigation: DashboardScreenNavigationProp;
  colors: ThemeColors;
}): ReactElement {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.h1, { color: colors.textPrimary }]}>
        Welcome to BeakerStack
      </Text>
      <Text style={[styles.lede, { color: colors.textSecondary }]}>
        This dashboard is a sandbox for @beakerstack/billing. For polished
        billing UI, use the web app.
      </Text>
      <Pressable
        onPress={() => navigation.navigate('Billing')}
        style={styles.navLink}
      >
        <Text style={[styles.navLinkText, { color: colors.accent }]}>
          View polished billing →
        </Text>
      </Pressable>

      <View style={styles.spacer} />

      <SectionCard
        title='Metered usage'
        demonstrates='useUsage, billing_record_usage_event, refresh()'
        description='AI summarize is metered. Free 30/mo, Pro 500, Max unlimited.'
        codeRef='await refresh() after RPC'
        colors={colors}
      >
        <MeteredBlock colors={colors} />
      </SectionCard>

      <SectionCard
        title='Numeric feature caps'
        demonstrates='useFeature (numeric), container caps'
        description='Free: 2 collections × 3 items. Pro: unlimited × 25. Max: unlimited both.'
        codeRef='useFeature("containers_per_account_max")'
        colors={colors}
      >
        <NumericCapsBlock colors={colors} />
      </SectionCard>

      <SectionCard
        title='Boolean feature gates'
        demonstrates='FeatureGate, useFeature (boolean)'
        description='Feature A at Pro+, Feature B at Max only.'
        codeRef='FeatureGate feature="feature_a"'
        colors={colors}
      >
        <BooleanGatesBlock colors={colors} />
      </SectionCard>

      <DemoControlsBlock colors={colors} />
    </ScrollView>
  );
}

export default function DashboardScreen({ navigation }: Props) {
  const auth = useAuthContext();
  const { dark, colors } = useDarkMode();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      const t = setTimeout(() => navigation.replace('Home'), 100);
      return () => clearTimeout(t);
    }
  }, [auth.loading, auth.user, navigation]);

  if (auth.loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size='large' color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!auth.user) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size='large' color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Redirecting...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <AppHeader supabaseClient={supabase} />
        <BillingProvider<typeof beakerstackBillingConfig>
          supabase={supabase}
          config={beakerstackBillingConfig}
          checkoutSuccessUrl={`${billingBaseUrl}/billing`}
          checkoutCancelUrl={`${billingBaseUrl}/billing/plans?checkout=cancel`}
          portalReturnUrl={`${billingBaseUrl}/billing`}
        >
          <DashboardBody navigation={navigation} colors={colors} />
        </BillingProvider>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '700' },
  lede: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  navLink: { marginTop: 12, alignSelf: 'flex-start' },
  navLinkText: { fontWeight: '600' },
  spacer: { height: 20 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  cardDemo: { borderStyle: 'dashed' as const },
  badge: {
    position: 'absolute' as const,
    right: 12,
    top: 10,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#92400e' },
  cardTitle: { fontSize: 18, fontWeight: '600', paddingRight: 100 },
  demonstratesLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  demonstratesMono: { fontFamily: 'monospace', fontSize: 12 },
  cardDesc: { marginTop: 6, fontSize: 14 },
  cardBody: { marginTop: 12 },
  codeLine: { marginTop: 12, fontSize: 11, fontFamily: 'monospace' },
  usageBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  usageBarFill: { height: 8, borderRadius: 4 },
  usageCapLine: { marginTop: 8, fontSize: 13 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnSecondaryText: { fontSize: 12, fontWeight: '500' },
  btnDanger: { marginLeft: 8, padding: 6 },
  btnDangerText: { color: '#b91c1c', fontSize: 12, fontWeight: '600' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  muted: { fontSize: 13, marginTop: 4 },
  errText: { color: '#b91c1c', fontSize: 13, marginTop: 4 },
  warnText: { color: '#b45309', fontSize: 12, marginBottom: 6 },
  bodyText: { fontSize: 14 },
  subH: { fontSize: 14, fontWeight: '600' },
  okText: { fontSize: 14, color: '#15803d' },
  resultBox: { marginTop: 12, borderWidth: 1, borderRadius: 8, padding: 10 },
  resultItem: { marginBottom: 10, borderBottomWidth: 1 },
  resultTs: { fontSize: 11 },
  resultBody: { fontSize: 13, marginTop: 2 },
  collectionCard: { marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  monoSm: { fontFamily: 'monospace', fontSize: 11 },
  tinyLegal: { fontSize: 10, marginTop: 8 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 16, fontSize: 16 },
});

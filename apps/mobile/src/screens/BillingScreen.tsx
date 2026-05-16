import { useRecordUsage, useUsage } from '@beakerstack/billing';
import {
  CustomerPortalLink,
  FeatureGate,
  PricingTable,
  SubscriptionStatus,
  UpgradePrompt,
  UsageIndicator,
} from '@beakerstack/billing/native';
import { useNavigation } from '@react-navigation/native';
import React, { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../billing/beakerstackBillingConfig';
import { supabase } from '../lib/supabase';

function readBillingScreenDemoMode(): boolean {
  return process.env?.['EXPO_PUBLIC_BILLING_DEMO_MODE'] === 'true';
}

function MeteredBlock(): ReactElement {
  const { exceeded, refresh } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);
  const { record, pending } = useRecordUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>AI summarize (metered)</Text>
      <UsageIndicator<typeof beakerstackBillingConfig>
        meter={BEAKERSTACK_METER_AI_SUMMARIZE}
        variant='text'
      />
      {exceeded ? (
        <UpgradePrompt<typeof beakerstackBillingConfig>
          targetTier='beakerstack_pro'
          reason='Monthly limit reached.'
        />
      ) : (
        <Pressable
          style={styles.btn}
          disabled={pending}
          onPress={() => void record(1)}
        >
          <Text style={styles.btnText}>
            {pending ? '…' : 'Use one summarize'}
          </Text>
        </Pressable>
      )}
      <Pressable onPress={() => void refresh()}>
        <Text style={styles.link}>Refresh usage</Text>
      </Pressable>
    </View>
  );
}

function DemoRpcButtons(): ReactElement {
  const [msg, setMsg] = useState<string | null>(null);
  if (!readBillingScreenDemoMode()) {
    return (
      <Text style={styles.muted}>
        Set EXPO_PUBLIC_BILLING_DEMO_MODE=true and DB demo_billing_mode for
        simulate controls.
      </Text>
    );
  }
  const sim = async (planId: string) => {
    const { error } = await supabase.rpc('billing_demo_simulate_upgrade', {
      p_product_id: 'beakerstack',
      p_plan_id: planId,
    });
    setMsg(error ? error.message : `Simulated ${planId}`);
  };
  return (
    <View style={styles.demoBox}>
      <Text style={styles.warn}>Demo mode — not real billing</Text>
      <Pressable
        style={styles.smallBtn}
        onPress={() => void sim('beakerstack_pro')}
      >
        <Text>Simulate Pro</Text>
      </Pressable>
      {msg ? <Text style={styles.muted}>{msg}</Text> : null}
    </View>
  );
}

export default function BillingScreen(): ReactElement {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginBottom: 8 }}
        >
          <Text style={styles.link}>← Back</Text>
        </Pressable>
        <Text style={styles.h1}>Billing</Text>
        <Text style={styles.subtitle}>
          For the full /billing experience (tabs, plans, invoices), use the web
          app. This screen reuses the billing package for dev testing.
        </Text>
        <DemoRpcButtons />
        <View style={styles.section}>
          <Text style={styles.h2}>Subscription</Text>
          <SubscriptionStatus<typeof beakerstackBillingConfig> />
          <CustomerPortalLink<typeof beakerstackBillingConfig>
            style={{ marginTop: 8 }}
          >
            <Text style={styles.link}>Customer portal</Text>
          </CustomerPortalLink>
          <PricingTable<typeof beakerstackBillingConfig> highlightCurrent />
        </View>
        <MeteredBlock />
        <View style={styles.section}>
          <Text style={styles.h2}>Feature B (Max)</Text>
          <FeatureGate<typeof beakerstackBillingConfig>
            feature='feature_b'
            fallback={
              <UpgradePrompt<typeof beakerstackBillingConfig>
                targetTier='beakerstack_max'
                reason='Feature B requires Max.'
              />
            }
          >
            <Text style={styles.ok}>Feature B enabled</Text>
          </FeatureGate>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, paddingBottom: 32 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  h2: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  section: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  btn: {
    backgroundColor: '#4f46e5',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  btnText: { color: '#fff' },
  link: { color: '#4f46e5', marginTop: 8 },
  muted: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  ok: { color: '#15803d' },
  demoBox: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  warn: { fontWeight: '600', marginBottom: 6 },
  smallBtn: {
    alignSelf: 'flex-start',
    padding: 6,
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 4,
  },
});

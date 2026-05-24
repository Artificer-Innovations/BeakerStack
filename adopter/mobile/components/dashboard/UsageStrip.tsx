import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  mapUnknownError,
  useBillingContext,
  useUsage,
} from '@beakerstack/billing';
import type { BillingError } from '@beakerstack/billing';
import { colors } from '@beakerstack/shared/theme/colors';
import { supabase } from '@mobile/lib/supabase';
import {
  billingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '@adopter/config/billing';
import { nextFakeAiSummary } from '@mobile/lib/fakeAi';
import { randomUuid } from '@mobile/lib/randomUuid';
import type { ActivityEntry } from './types';

function readDemoUseRealAi(): boolean {
  return process.env?.['EXPO_PUBLIC_DEMO_USE_REAL_AI'] === 'true';
}

interface Props {
  onActivity?: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void;
}

export function UsageStrip({ onActivity }: Props) {
  const { config } = useBillingContext<typeof billingConfig>();
  const {
    used,
    limit,
    resetsAt,
    exceeded,
    loading,
    error: usageError,
    refresh,
  } = useUsage<typeof billingConfig, typeof BEAKERSTACK_METER_AI_SUMMARIZE>(
    BEAKERSTACK_METER_AI_SUMMARIZE
  );

  const [results, setResults] = useState<
    { id: string; text: string; at: number }[]
  >([]);
  const [pending, setPending] = useState(false);
  const [recordError, setRecordError] = useState<BillingError | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const simulateInFlightRef = useRef(false);

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
        /* edge function unavailable — use fake fallback */
      }
    }
    return nextFakeAiSummary();
  }, []);

  const onSimulate = useCallback(async () => {
    if (exceeded || pending || simulateInFlightRef.current) return;
    simulateInFlightRef.current = true;
    const key = pendingKey ?? randomUuid();
    if (!pendingKey) setPendingKey(key);
    setPending(true);
    setRecordError(null);
    try {
      const summaryText = await resolveSummaryText();
      const { error: rpcErr } = await supabase.rpc(
        'billing_record_usage_event',
        {
          p_product_id: config.productId,
          p_event_type: BEAKERSTACK_METER_AI_SUMMARIZE,
          p_quantity: 1,
          p_metadata: {},
          p_idempotency_key: key,
        }
      );
      if (rpcErr) throw rpcErr;
      await refresh();
      setResults(prev =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            at: Date.now(),
            text: summaryText,
          },
          ...prev,
        ].slice(0, 3)
      );
      setPendingKey(null);
      onActivity?.({
        label: 'AI summarize recorded',
        rpc: 'billing_record_usage_event',
      });
    } catch (e) {
      setRecordError(mapUnknownError(e));
    } finally {
      simulateInFlightRef.current = false;
      setPending(false);
    }
  }, [
    exceeded,
    pending,
    pendingKey,
    config.productId,
    refresh,
    resolveSummaryText,
    onActivity,
  ]);

  const lim = limit === null ? '∞' : String(limit);
  const pct =
    limit != null && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const capLine =
    limit === null
      ? `${used} used this period · unlimited`
      : `${used} of ${lim} used · resets ${
          resetsAt ? new Date(resetsAt).toLocaleDateString() : '—'
        }`;

  const displayError = recordError ?? usageError;

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>AI Summaries</Text>
        {exceeded ? (
          <View style={styles.limitBadge}>
            <Text style={styles.limitBadgeText}>Limit reached</Text>
          </View>
        ) : null}
      </View>

      {limit != null ? (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      ) : null}
      <Text style={styles.capLine}>{loading ? '…' : capLine}</Text>

      <View style={styles.actions}>
        {exceeded ? (
          <Text style={styles.limitNote}>
            Monthly limit reached for this meter.
          </Text>
        ) : (
          <Pressable
            style={[styles.btnPrimary, pending && styles.btnDisabled]}
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
        <Text style={styles.err} accessibilityRole='alert'>
          {displayError.message}
        </Text>
      ) : null}

      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map(r => (
            <View key={r.id} style={styles.resultItem}>
              <Text style={styles.resultTs}>
                {new Date(r.at).toLocaleTimeString()}
              </Text>
              <Text style={styles.resultBody}>{r.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  limitBadge: {
    backgroundColor: colors.errorBadgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  limitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.errorTextAlt,
  },
  barTrack: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  capLine: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  btnPrimary: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimaryText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  limitNote: { fontSize: 14, color: colors.textMuted },
  err: { marginTop: 8, fontSize: 13, color: colors.errorIcon },
  results: { marginTop: 16, gap: 8 },
  resultItem: {
    borderRadius: 8,
    backgroundColor: colors.pageBg,
    padding: 12,
  },
  resultTs: { fontSize: 11, color: colors.textFaint, marginBottom: 4 },
  resultBody: { fontSize: 13, color: colors.textBody },
});

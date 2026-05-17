import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  mapUnknownError,
  useBillingContext,
  useFeature,
  useUsage,
} from '@beakerstack/billing';
import type { BillingError } from '@beakerstack/billing';
import { colors } from '@beakerstack/shared/theme/colors';
import { supabase } from '../../lib/supabase';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import { nextFakeAiSummary } from '../../lib/fakeAi';
import { randomUuid } from '../../lib/randomUuid';
import type { DemoCollectionRow } from '../../billing/useDemoCollections';
import type { ActivityEntry } from './types';
import { limLabel } from './utils';

interface Props {
  collection: DemoCollectionRow | undefined;
  addItem: (collectionId: string) => Promise<void>;
  onActivity?: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void;
}

export function CollectionDetail({ collection, addItem, onActivity }: Props) {
  const { config } = useBillingContext<typeof beakerstackBillingConfig>();
  const { value: maxItemsRaw, loading: featLoading } = useFeature<
    typeof beakerstackBillingConfig,
    'items_per_container_max'
  >('items_per_container_max');
  const featureA = useFeature<typeof beakerstackBillingConfig, 'feature_a'>(
    'feature_a'
  );
  const featureB = useFeature<typeof beakerstackBillingConfig, 'feature_b'>(
    'feature_b'
  );
  const {
    exceeded: usageExceeded,
    loading: usageLoading,
    refresh: refreshUsage,
  } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);

  const maxItems = typeof maxItemsRaw === 'number' ? maxItemsRaw : null;
  const itemCount = collection?.item_count ?? 0;
  const atItemCap =
    maxItems !== null && maxItems !== -1 && itemCount >= maxItems;

  const [summaries, setSummaries] = useState<Map<number, string>>(new Map());
  const [summarizeBusy, setSummarizeBusy] = useState<Set<number>>(new Set());
  const [summarizeErrors, setSummarizeErrors] = useState<
    Map<number, BillingError>
  >(new Map());
  const [summarizeKeys, setSummarizeKeys] = useState<Map<number, string>>(
    new Map()
  );
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [featureToast, setFeatureToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(0);

  useEffect(() => {
    setSummaries(new Map());
    setSummarizeBusy(new Set());
    setSummarizeErrors(new Map());
    setSummarizeKeys(new Map());
  }, [collection?.id]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setFeatureToast(msg);
    toastTimer.current = setTimeout(() => setFeatureToast(null), 3000);
  }, []);

  const onSummarize = useCallback(
    async (itemIndex: number) => {
      if (!collection || usageExceeded || inFlightRef.current > 0) return;
      inFlightRef.current += 1;
      setSummarizeBusy(prev => new Set(prev).add(itemIndex));
      setSummarizeErrors(prev => {
        const next = new Map(prev);
        next.delete(itemIndex);
        return next;
      });
      const key = summarizeKeys.get(itemIndex) ?? randomUuid();
      setSummarizeKeys(prev => new Map(prev).set(itemIndex, key));
      try {
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
        await refreshUsage();
        const text = nextFakeAiSummary();
        setSummaries(prev => new Map(prev).set(itemIndex, text));
        setSummarizeKeys(prev => {
          const next = new Map(prev);
          next.delete(itemIndex);
          return next;
        });
        onActivity?.({
          label: `Item ${itemIndex + 1} summarized`,
          rpc: 'billing_record_usage_event',
        });
      } catch (e) {
        setSummarizeErrors(prev =>
          new Map(prev).set(itemIndex, mapUnknownError(e))
        );
      } finally {
        inFlightRef.current -= 1;
        setSummarizeBusy(prev => {
          const next = new Set(prev);
          next.delete(itemIndex);
          return next;
        });
      }
    },
    [
      collection,
      usageExceeded,
      config.productId,
      refreshUsage,
      onActivity,
      summarizeKeys,
    ]
  );

  const onAddItem = useCallback(async () => {
    if (!collection || atItemCap) return;
    setAddErr(null);
    setAddBusy(true);
    try {
      await addItem(collection.id);
      onActivity?.({ label: 'Item added', rpc: 'billing_demo_add_item' });
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setAddBusy(false);
    }
  }, [collection, atItemCap, addItem, onActivity]);

  if (!collection) {
    return (
      <View style={styles.emptySelect}>
        <Text style={styles.emptySelectText}>
          Select a collection above to view its items.
        </Text>
      </View>
    );
  }

  const itemRows = Array.from({ length: itemCount }, (_, i) => i);
  const anySummarizeBusy = summarizeBusy.size > 0;

  return (
    <View>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Items</Text>
          <Text style={styles.sub}>
            {featLoading
              ? '…'
              : `${itemCount} of ${limLabel(maxItems)} in this collection`}
          </Text>
        </View>
        <View style={styles.featureBtns}>
          <Pressable
            style={[
              styles.featBtn,
              featureA.enabled ? styles.featBtnAOn : styles.featBtnOff,
            ]}
            disabled={featureA.loading}
            onPress={() => {
              if (featureA.enabled) {
                showToast('Feature A action triggered');
              } else {
                showToast(
                  'Feature A is not enabled on your current plan (useFeature returns false).'
                );
              }
            }}
          >
            <Text
              style={[
                styles.featBtnText,
                !featureA.enabled && styles.featBtnTextOff,
              ]}
            >
              Feature A
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.featBtn,
              featureB.enabled ? styles.featBtnBOn : styles.featBtnOff,
            ]}
            disabled={featureB.loading}
            onPress={() => {
              if (featureB.enabled) {
                showToast('Feature B action triggered');
              } else {
                showToast(
                  'Feature B is not enabled on your current plan (useFeature returns false).'
                );
              }
            }}
          >
            <Text
              style={[
                styles.featBtnText,
                !featureB.enabled && styles.featBtnTextOff,
              ]}
            >
              Feature B
            </Text>
          </Pressable>
        </View>
      </View>

      {featureToast ? (
        <View style={styles.toast} accessibilityLiveRegion='polite'>
          <Text style={styles.toastText}>{featureToast}</Text>
        </View>
      ) : null}

      {addErr ? (
        <Text style={styles.err} accessibilityRole='alert'>
          {addErr}
        </Text>
      ) : null}

      {itemRows.length === 0 ? (
        <Text style={styles.emptyItems}>No items yet. Add one below.</Text>
      ) : (
        <View style={styles.itemList}>
          {itemRows.map(i => {
            const isBusy = summarizeBusy.has(i);
            const summary = summaries.get(i);
            const err = summarizeErrors.get(i);
            const summarizeDisabled =
              anySummarizeBusy || usageExceeded || usageLoading;
            return (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemLabel}>Item {i + 1}</Text>
                  <Pressable
                    style={[
                      styles.summarizeBtn,
                      summarizeDisabled &&
                        !isBusy &&
                        styles.summarizeBtnDisabled,
                    ]}
                    disabled={summarizeDisabled && !isBusy}
                    onPress={() => void onSummarize(i)}
                    accessibilityLabel={
                      usageExceeded
                        ? 'AI summarize limit reached'
                        : anySummarizeBusy && !isBusy
                          ? 'Another item is being summarized'
                          : 'Summarize'
                    }
                  >
                    <Text style={styles.summarizeBtnText}>
                      {isBusy
                        ? '…'
                        : usageExceeded
                          ? 'Limit reached'
                          : 'Summarize'}
                    </Text>
                  </Pressable>
                </View>
                {err ? (
                  <Text style={styles.itemErr} accessibilityRole='alert'>
                    {err.message}
                  </Text>
                ) : null}
                {summary ? (
                  <Text style={styles.summaryText}>{summary}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        style={[
          styles.addItemBtn,
          (atItemCap || featLoading || addBusy) && styles.btnDisabled,
        ]}
        disabled={atItemCap || featLoading || addBusy}
        onPress={() => void onAddItem()}
      >
        <Text style={styles.addItemBtnText}>
          {addBusy ? '…' : atItemCap ? 'Item limit reached' : '+ Add item'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  emptySelect: { paddingVertical: 24, alignItems: 'center' },
  emptySelectText: { fontSize: 13, color: colors.textMuted },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  sub: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  featureBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  featBtnAOn: { backgroundColor: colors.brandLight },
  featBtnBOn: { backgroundColor: colors.featureBOnBg },
  featBtnOff: { backgroundColor: colors.rowDivider },
  featBtnText: { fontSize: 11, fontWeight: '700', color: colors.brandDark },
  featBtnTextOff: { color: colors.textFaint },
  toast: {
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.indigo[200],
    backgroundColor: colors.indigo[50],
    padding: 10,
  },
  toastText: { fontSize: 13, color: colors.indigo[800] },
  err: { marginBottom: 10, fontSize: 13, color: colors.errorIcon },
  emptyItems: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
  itemList: { gap: 8, marginBottom: 10 },
  itemCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  itemLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  summarizeBtn: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  summarizeBtnDisabled: { opacity: 0.5 },
  summarizeBtnText: { fontSize: 11, fontWeight: '600', color: colors.textBody },
  itemErr: { marginTop: 6, fontSize: 11, color: colors.errorIcon },
  summaryText: {
    marginTop: 8,
    fontSize: 11,
    color: colors.textSubtle,
    lineHeight: 16,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gray[300],
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  addItemBtnText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  btnDisabled: { opacity: 0.5 },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import {
  mapUnknownError,
  useBillingContext,
  useFeature,
  useUsage,
} from '@beakerstack/billing';
import type { BillingError } from '@beakerstack/billing';
import { supabaseRpc } from '@/lib/supabase';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import { nextFakeAiSummary } from '../../lib/fakeAi';
import type { DemoCollectionRow } from '../../billing/useDemoCollections';
import type { ActivityEntry } from './types';
import { limLabel } from './utils';

interface Props {
  collection: DemoCollectionRow | undefined;
  addItem: (collectionId: string) => Promise<void>;
  onActivity: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void;
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

  // Summarize results keyed by item index
  const [summaries, setSummaries] = useState<Map<number, string>>(new Map());
  const [summarizeBusy, setSummarizeBusy] = useState<Set<number>>(new Set());
  const [summarizeErrors, setSummarizeErrors] = useState<
    Map<number, BillingError>
  >(new Map());
  // Retained per-item idempotency keys: reused on retry, cleared on success.
  const [summarizeKeys, setSummarizeKeys] = useState<Map<number, string>>(
    new Map()
  );
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [featureToast, setFeatureToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks how many summarize RPCs are currently in flight. A ref (not state)
  // so the guard in onSummarize always sees the current value without a stale closure.
  const inFlightRef = useRef(0);

  // Reset per-item summarize state when the selected collection changes.
  useEffect(() => {
    setSummaries(new Map());
    setSummarizeBusy(new Set());
    setSummarizeErrors(new Map());
    setSummarizeKeys(new Map());
  }, [collection?.id]);

  // Clear any pending toast timer on unmount.
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
      // Reuse the key from a previous failed attempt; generate a fresh one otherwise.
      const key = summarizeKeys.get(itemIndex) ?? crypto.randomUUID();
      setSummarizeKeys(prev => new Map(prev).set(itemIndex, key));
      try {
        const { error: rpcErr } = await supabaseRpc.rpc(
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
        onActivity({
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
      onActivity({ label: 'Item added', rpc: 'billing_demo_add_item' });
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setAddBusy(false);
    }
  }, [collection, atItemCap, addItem, onActivity]);

  if (!collection) {
    return (
      <div className='flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400'>
        Select a collection above to view its items.
      </div>
    );
  }

  const itemRows = Array.from({ length: itemCount }, (_, i) => i);
  const anySummarizeBusy = summarizeBusy.size > 0;

  return (
    <div>
      {/* Collection header */}
      <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
        <div>
          <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
            Items
          </h3>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
            {featLoading
              ? '…'
              : `${itemCount} of ${limLabel(maxItems)} in this collection`}
          </p>
        </div>
        {/* Feature A / Feature B header actions */}
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            disabled={featureA.loading}
            onClick={() => {
              if (featureA.enabled) {
                showToast('Feature A action triggered');
              } else {
                showToast(
                  'Feature A requires Pro or higher. Upgrade at /billing.'
                );
              }
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
              featureA.enabled
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
            }`}
          >
            Feature A
          </button>
          <button
            type='button'
            disabled={featureB.loading}
            onClick={() => {
              if (featureB.enabled) {
                showToast('Feature B action triggered');
              } else {
                showToast('Feature B requires Max plan. Upgrade at /billing.');
              }
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
              featureB.enabled
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
            }`}
          >
            Feature B
          </button>
        </div>
      </div>

      {featureToast && (
        <div
          className='mb-3 rounded-md bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 px-3 py-2 text-sm text-indigo-800 dark:text-indigo-300'
          role='status'
          aria-live='polite'
        >
          {featureToast}
        </div>
      )}

      {addErr && (
        <p className='mb-3 text-sm text-red-600' role='alert'>
          {addErr}
        </p>
      )}

      {/* Item list */}
      {itemRows.length === 0 ? (
        <p className='text-sm text-gray-500 dark:text-gray-400 py-2'>
          No items yet. Add one below.
        </p>
      ) : (
        <ul className='space-y-2 mb-3'>
          {itemRows.map(i => {
            const isBusy = summarizeBusy.has(i);
            const summary = summaries.get(i);
            const err = summarizeErrors.get(i);
            return (
              <li
                key={i}
                className='rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3'
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <span className='text-sm font-medium text-gray-800 dark:text-gray-200'>
                    Item {i + 1}
                  </span>
                  {/* Wrapper span carries the tooltip so it's visible even when the button is disabled */}
                  <span
                    title={
                      usageExceeded
                        ? 'AI summarize limit reached'
                        : anySummarizeBusy && !isBusy
                          ? 'Another item is being summarized'
                          : undefined
                    }
                  >
                    <button
                      type='button'
                      disabled={
                        anySummarizeBusy || usageExceeded || usageLoading
                      }
                      aria-describedby={
                        anySummarizeBusy && !isBusy
                          ? `summarize-wait-${i}`
                          : undefined
                      }
                      onClick={() => void onSummarize(i)}
                      className='inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
                    >
                      <Sparkles className='h-3 w-3' aria-hidden />
                      {isBusy
                        ? '…'
                        : usageExceeded
                          ? 'Limit reached'
                          : 'Summarize'}
                    </button>
                    {anySummarizeBusy && !isBusy && (
                      <span id={`summarize-wait-${i}`} className='sr-only'>
                        Another item is being summarized. Please wait.
                      </span>
                    )}
                  </span>
                </div>
                {err && (
                  <p className='mt-1 text-xs text-red-600' role='alert'>
                    {err.message}
                  </p>
                )}
                {summary && (
                  <p className='mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed'>
                    {summary}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add item row */}
      <button
        type='button'
        disabled={atItemCap || featLoading || addBusy}
        title={atItemCap ? 'Item limit reached for this collection' : undefined}
        onClick={() => void onAddItem()}
        className='flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50 transition-colors'
      >
        <Plus className='h-4 w-4' aria-hidden />
        {addBusy ? '…' : atItemCap ? 'Item limit reached' : 'Add item'}
      </button>
    </div>
  );
}

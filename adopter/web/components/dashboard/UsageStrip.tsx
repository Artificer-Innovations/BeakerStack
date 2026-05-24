import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  mapUnknownError,
  useBillingContext,
  useUsage,
} from '@beakerstack/billing';
import type { BillingError } from '@beakerstack/billing';
import { supabase, supabaseRpc } from '@/lib/supabase';
import {
  billingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '@adopter/config/billing';
import { nextFakeAiSummary } from '../../lib/fakeAi';
import type { ActivityEntry } from './types';

const useRealAi = import.meta.env.VITE_DEMO_USE_REAL_AI === 'true';

interface Props {
  onActivity: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void;
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
  // Retained across failed attempts so a retry reuses the same key and the
  // server deduplicates it. Cleared on success so the next action gets a fresh key.
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const resolveSummaryText = useCallback(async (): Promise<string> => {
    if (useRealAi) {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          'demo-ai-summarize',
          { body: { prompt: 'Write a short lorem-style summary (3-5 lines).' } }
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
    if (exceeded || pending) return;
    const summaryText = await resolveSummaryText();
    const key = pendingKey ?? crypto.randomUUID();
    if (!pendingKey) setPendingKey(key);
    setPending(true);
    setRecordError(null);
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
      onActivity({
        label: 'AI summarize recorded',
        rpc: 'billing_record_usage_event',
      });
    } catch (e) {
      setRecordError(mapUnknownError(e));
    } finally {
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
      : `${used} of ${lim} used · resets ${resetsAt ? new Date(resetsAt).toLocaleDateString() : '—'}`;

  const displayError = recordError ?? usageError;

  return (
    <div>
      <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
        AI Summaries
        {exceeded && (
          <span className='rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400'>
            Limit reached
          </span>
        )}
      </h3>

      {limit != null && (
        <div className='h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700'>
          <div
            className='h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all'
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className='mt-1.5 text-sm text-gray-500 dark:text-gray-400'>
        {loading ? '…' : capLine}
      </p>

      <div className='mt-4 flex flex-wrap items-center gap-3'>
        {exceeded ? (
          <Link
            to='/billing/plans'
            className='text-sm font-medium text-indigo-600 hover:text-indigo-500'
          >
            Upgrade to get more summaries →
          </Link>
        ) : (
          <button
            type='button'
            disabled={pending}
            onClick={() => void onSimulate()}
            className='inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50'
          >
            {pending ? '…' : 'Simulate AI summarize'}
          </button>
        )}
      </div>

      {displayError && (
        <p className='mt-2 text-sm text-red-600' role='alert'>
          {displayError.message}
        </p>
      )}

      {results.length > 0 && (
        <ul className='mt-4 space-y-2'>
          {results.map(r => (
            <li
              key={r.id}
              className='rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-700 dark:text-gray-300'
            >
              <span className='block text-xs text-gray-400 dark:text-gray-500 mb-1'>
                {new Date(r.at).toLocaleTimeString()}
              </span>
              {r.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import { nextFakeAiSummary } from '../../lib/fakeAi';
import { AISummarizeResult, type SummaryEntry } from './AISummarizeResult';

const useRealAi = import.meta.env.VITE_DEMO_USE_REAL_AI === 'true';

export function MeteredUsageDemo() {
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
    if (useRealAi) {
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
          if (typeof t === 'string' && t.trim()) {
            return t.trim();
          }
        }
      } catch {
        /* optional demo-ai edge function unavailable — fallback below */
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
      const { error: rpcErr } = await supabaseRpc.rpc(
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
      : `${used} of ${lim} used · resets ${resetsAt ? new Date(resetsAt).toLocaleDateString() : '—'}`;
  const pct =
    limit != null && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  const displayError = recordError ?? usageError;

  return (
    <div>
      <div className='mt-0' data-testid='usage-indicator-expanded'>
        {limit != null && (
          <div className='mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700'>
            <div
              className='h-2 rounded-full bg-indigo-600 dark:bg-indigo-500'
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <div className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
          {loading ? '…' : capLine}
        </div>
      </div>
      <div className='mt-4 flex flex-wrap items-center gap-2'>
        {exceeded ? (
          <>
            <span
              className='inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-500 dark:text-gray-400'
              title='Usage cap reached for this period'
            >
              Limit reached
            </span>
            <Link
              to='/billing/plans'
              className='text-sm font-medium text-indigo-600 hover:text-indigo-500'
            >
              Upgrade
            </Link>
          </>
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
      <AISummarizeResult entries={results} />
    </div>
  );
}

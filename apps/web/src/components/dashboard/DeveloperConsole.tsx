import { useFeature, useUsage } from '@beakerstack/billing';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import type { ActivityEntry } from './types';

function val(v: boolean | number | null | undefined, loading: boolean): string {
  if (loading) return '…';
  if (v === null || v === undefined) return 'null';
  if (v === -1) return '∞';
  return String(v);
}

function HookStatePanel() {
  const {
    used,
    limit,
    exceeded,
    loading: usageLoading,
  } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);

  const colCap = useFeature<
    typeof beakerstackBillingConfig,
    'containers_per_account_max'
  >('containers_per_account_max');
  const itemCap = useFeature<
    typeof beakerstackBillingConfig,
    'items_per_container_max'
  >('items_per_container_max');
  const featA = useFeature<typeof beakerstackBillingConfig, 'feature_a'>(
    'feature_a'
  );
  const featB = useFeature<typeof beakerstackBillingConfig, 'feature_b'>(
    'feature_b'
  );

  const rows: { hook: string; output: string }[] = [
    {
      hook: 'useUsage("ai_summarize")',
      output: usageLoading
        ? '{ … }'
        : `{ used: ${used}, limit: ${limit === null ? '∞' : limit}, exceeded: ${exceeded} }`,
    },
    {
      hook: 'useFeature("containers_per_account_max")',
      output: `{ value: ${val(colCap.value, colCap.loading)}, enabled: ${val(colCap.enabled, colCap.loading)} }`,
    },
    {
      hook: 'useFeature("items_per_container_max")',
      output: `{ value: ${val(itemCap.value, itemCap.loading)}, enabled: ${val(itemCap.enabled, itemCap.loading)} }`,
    },
    {
      hook: 'useFeature("feature_a")',
      output: `{ enabled: ${val(featA.enabled, featA.loading)} }`,
    },
    {
      hook: 'useFeature("feature_b")',
      output: `{ enabled: ${val(featB.enabled, featB.loading)} }`,
    },
  ];

  return (
    <div className='space-y-2'>
      <p className='text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3'>
        Live hook state
      </p>
      {rows.map(r => (
        <div key={r.hook} className='rounded bg-slate-800 px-3 py-2'>
          <p className='font-mono text-xs text-purple-300'>{r.hook}</p>
          <p className='font-mono text-xs text-slate-300 mt-0.5 break-all'>
            → {r.output}
          </p>
        </div>
      ))}
    </div>
  );
}

interface ActivityLogProps {
  entries: ActivityEntry[];
}

function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <div>
      <p className='text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3'>
        Activity log
      </p>
      {entries.length === 0 ? (
        <p className='text-xs text-slate-500 italic'>No activity yet.</p>
      ) : (
        <ul
          className='space-y-1 max-h-64 overflow-y-auto'
          role='log'
          aria-live='polite'
          aria-label='Activity log'
        >
          {entries.map(e => (
            <li key={e.id} className='font-mono text-xs text-slate-300'>
              <span className='text-slate-500'>
                [{e.at.toLocaleTimeString()}]
              </span>{' '}
              {e.label}{' '}
              <span className='text-slate-500'>({e.rpc})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface DeveloperConsoleProps {
  activityLog: ActivityEntry[];
}

export function DeveloperConsole({ activityLog }: DeveloperConsoleProps) {
  return (
    <div className='w-full border-t border-slate-700 bg-slate-900 text-slate-100'>
      <div className='mx-auto max-w-[1024px] px-4 py-6 sm:px-6'>
        <p className='text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5'>
          Developer Console
        </p>
        <div className='grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2'>
          <HookStatePanel />
          <ActivityLog entries={activityLog} />
        </div>
      </div>
    </div>
  );
}

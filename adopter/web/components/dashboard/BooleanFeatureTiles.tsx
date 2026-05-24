import { Check, X } from 'lucide-react';
import { useFeature } from '@beakerstack/billing';
import { billingConfig } from '@adopter/config/billing';

interface TileProps {
  label: string;
  plan: string;
  enabled: boolean;
  loading: boolean;
  hookExpr: string;
}

function FeatureTile({ label, plan, enabled, loading, hookExpr }: TileProps) {
  return (
    <div
      className={`rounded-lg border-2 p-5 transition-colors ${
        enabled
          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      }`}
    >
      <div className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-sm font-semibold text-gray-900 dark:text-white'>
            {label}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
            {plan}
          </p>
        </div>
        <div
          className={`rounded-full p-1.5 shrink-0 ${
            enabled
              ? 'bg-green-100 dark:bg-green-900/50'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          {loading ? (
            <span className='block h-4 w-4' />
          ) : enabled ? (
            <Check
              className='h-4 w-4 text-green-600 dark:text-green-400'
              aria-hidden
            />
          ) : (
            <X
              className='h-4 w-4 text-gray-400 dark:text-gray-500'
              aria-hidden
            />
          )}
        </div>
      </div>
      <div className='mt-3 rounded bg-slate-900 px-2.5 py-1.5'>
        <code className='font-mono text-xs text-slate-300 break-all'>
          {hookExpr} →{' '}
          <span className={enabled ? 'text-green-400' : 'text-slate-500'}>
            {loading ? '…' : String(enabled)}
          </span>
        </code>
      </div>
    </div>
  );
}

export function BooleanFeatureTiles() {
  const featureA = useFeature<typeof billingConfig, 'feature_a'>('feature_a');
  const featureB = useFeature<typeof billingConfig, 'feature_b'>('feature_b');

  return (
    <div>
      <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-4'>
        Boolean feature gates
      </h3>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <FeatureTile
          label='Feature A'
          plan='Requires Pro+'
          enabled={featureA.enabled}
          loading={featureA.loading}
          hookExpr='useFeature("feature_a").enabled'
        />
        <FeatureTile
          label='Feature B'
          plan='Requires Max'
          enabled={featureB.enabled}
          loading={featureB.loading}
          hookExpr='useFeature("feature_b").enabled'
        />
      </div>
    </div>
  );
}

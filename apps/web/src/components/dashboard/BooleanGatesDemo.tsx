import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useFeature, usePlan } from '@beakerstack/billing';
import { FeatureGate } from '@beakerstack/billing/web';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';

function UpgradeLine({ name }: { name: string }) {
  return (
    <p className='text-sm text-gray-600'>
      {name} requires a higher plan.{' '}
      <Link
        to='/billing/plans'
        className='font-medium text-indigo-600 hover:text-indigo-500'
      >
        Upgrade →
      </Link>
    </p>
  );
}

export function BooleanGatesDemo() {
  const { loading: planLoading } = usePlan<typeof beakerstackBillingConfig>();
  const imperativeA = useFeature<typeof beakerstackBillingConfig, 'feature_a'>(
    'feature_a'
  );
  const imperativeB = useFeature<typeof beakerstackBillingConfig, 'feature_b'>(
    'feature_b'
  );

  return (
    <div className='space-y-6'>
      <div>
        <p className='text-sm font-medium text-gray-800'>
          Feature A (requires Pro)
        </p>
        <div className='mt-2'>
          {planLoading ? (
            <span className='text-sm text-gray-500'>…</span>
          ) : (
            <FeatureGate<typeof beakerstackBillingConfig>
              feature='feature_a'
              fallback={<UpgradeLine name='Feature A' />}
            >
              <p className='flex items-center gap-2 text-sm text-green-700'>
                <Check className='h-4 w-4 shrink-0' aria-hidden />
                Feature A is enabled for your plan.
              </p>
            </FeatureGate>
          )}
        </div>
      </div>
      <div>
        <p className='text-sm font-medium text-gray-800'>
          Feature B (requires Max)
        </p>
        <div className='mt-2'>
          {planLoading ? (
            <span className='text-sm text-gray-500'>…</span>
          ) : (
            <FeatureGate<typeof beakerstackBillingConfig>
              feature='feature_b'
              fallback={<UpgradeLine name='Feature B' />}
            >
              <p className='flex items-center gap-2 text-sm text-green-700'>
                <Check className='h-4 w-4 shrink-0' aria-hidden />
                Feature B is enabled for your plan.
              </p>
            </FeatureGate>
          )}
        </div>
      </div>
      <p className='text-sm text-gray-600'>
        Imperative equivalent:{' '}
        <code className='text-xs text-gray-800'>
          const {'{'} enabled {'}'} = useFeature(&quot;feature_a&quot;)
        </code>{' '}
        → currently{' '}
        <span className='font-mono text-gray-900'>
          {imperativeA.loading ? '…' : String(imperativeA.enabled)}
        </span>
        {' · '}
        <code className='text-xs text-gray-800'>
          useFeature(&quot;feature_b&quot;)
        </code>{' '}
        →{' '}
        <span className='font-mono text-gray-900'>
          {imperativeB.loading ? '…' : String(imperativeB.enabled)}
        </span>
      </p>
    </div>
  );
}

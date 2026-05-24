import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { usePlan } from '@beakerstack/billing';
import { FeatureGate } from '@beakerstack/billing/web';
import { billingConfig } from '@adopter/config/billing';

export function FeatureGateCard() {
  const { loading: planLoading } = usePlan<typeof billingConfig>();

  return (
    <div>
      <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>
        Feature A{' '}
        <span className='font-normal text-gray-500 dark:text-gray-400'>
          (Pro+)
        </span>
      </h3>
      {planLoading ? (
        <span className='text-sm text-gray-500'>…</span>
      ) : (
        <FeatureGate<typeof billingConfig>
          feature='feature_a'
          fallback={
            <div className='rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 p-5'>
              <div className='flex items-start gap-3'>
                <div className='rounded-full bg-purple-100 dark:bg-purple-900/50 p-2 shrink-0'>
                  <Lock
                    className='h-4 w-4 text-purple-600 dark:text-purple-400'
                    aria-hidden
                  />
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>
                    Feature A is locked on your current plan
                  </p>
                  <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                    Upgrade to Pro or Max to unlock Feature A.{' '}
                    <code className='text-xs font-mono'>
                      useFeature("feature_a").enabled
                    </code>{' '}
                    returns{' '}
                    <span className='font-mono text-gray-900 dark:text-white'>
                      false
                    </span>{' '}
                    on your plan — <code className='text-xs'>FeatureGate</code>{' '}
                    renders this fallback.
                  </p>
                  <Link
                    to='/billing/plans'
                    className='mt-3 inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500'
                  >
                    Upgrade →
                  </Link>
                </div>
              </div>
            </div>
          }
        >
          <div className='flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4'>
            <Check
              className='h-5 w-5 shrink-0 text-green-600 dark:text-green-400'
              aria-hidden
            />
            <div>
              <p className='text-sm font-medium text-green-800 dark:text-green-300'>
                Feature A is active
              </p>
              <p className='text-xs text-green-700 dark:text-green-400 mt-0.5'>
                <code className='font-mono'>
                  useFeature("feature_a").enabled
                </code>{' '}
                → <span className='font-mono'>true</span> ·{' '}
                <code className='font-mono'>FeatureGate</code> renders children
              </p>
            </div>
          </div>
        </FeatureGate>
      )}
    </div>
  );
}

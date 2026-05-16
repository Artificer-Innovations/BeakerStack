import { usePlanCatalog } from '@beakerstack/billing';
import type { Plan } from '@beakerstack/billing';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';
import {
  cadenceAnnualSavingsFromPlans,
  formatCadenceToggleSavingsBadge,
} from '@beakerstack/billing/presentation';

export function getCadenceFromSearch(search: URLSearchParams) {
  return search.get('cadence') === 'annual' ? 'annual' : 'monthly';
}

function CadenceToggleView({ plans }: { plans: Plan[] }) {
  const [search, setSearch] = useSearchParams();
  const savings = useMemo(() => cadenceAnnualSavingsFromPlans(plans), [plans]);
  const annualBadgeText = useMemo(
    () => formatCadenceToggleSavingsBadge(savings),
    [savings]
  );

  const cadence = search.get('cadence') === 'annual' ? 'annual' : 'monthly';
  const set = useCallback(
    (c: 'monthly' | 'annual') => {
      const n = new URLSearchParams(search);
      if (c === 'monthly') n.delete('cadence');
      else n.set('cadence', 'annual');
      setSearch(n, { replace: true });
    },
    [search, setSearch]
  );

  return (
    <div className='flex items-center justify-center gap-1'>
      <div className='inline-flex rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-sm'>
        <button
          type='button'
          onClick={() => set('monthly')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            cadence === 'monthly'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Monthly
        </button>
        <button
          type='button'
          onClick={() => set('annual')}
          aria-label={
            annualBadgeText ? `Annually, ${annualBadgeText}` : 'Annually'
          }
          className={`inline-flex min-h-[2.25rem] items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            cadence === 'annual'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span>Annually</span>
          {annualBadgeText ? (
            <span
              className={
                cadence === 'annual'
                  ? 'rounded-full border border-amber-400 bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow-sm ring-1 ring-white/40'
                  : 'rounded-full border border-amber-600 bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow-md ring-1 ring-amber-200/80'
              }
            >
              {annualBadgeText}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

function CadenceToggleFromCatalog() {
  const { plans } = usePlanCatalog<typeof beakerstackBillingConfig>();
  return <CadenceToggleView plans={plans} />;
}

/**
 * Billing cadence toggle. Reads/sets `?cadence=annual` (omitted = monthly) via React Router search params.
 * Pass `plans` to bypass the Supabase catalog lookup (e.g. on anonymous marketing pages).
 */
export function CadenceToggle({ plans }: { plans?: Plan[] } = {}) {
  return plans != null ? (
    <CadenceToggleView plans={plans} />
  ) : (
    <CadenceToggleFromCatalog />
  );
}

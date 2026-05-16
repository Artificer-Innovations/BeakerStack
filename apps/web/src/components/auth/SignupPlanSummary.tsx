import { usePlanCatalog } from '@beakerstack/billing';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';
import {
  annualListCentsFromSync,
  formatSavingsCalloutFromCopy,
  planAnnualSavingsCopy,
} from '@beakerstack/billing/presentation';
import { getCadenceFromSearch } from '../billing/CadenceToggle.web';
import { hasPaidPlanIntent } from '../../auth/postAuthRedirect';
import { planSignupBullets } from '../../auth/planSignupBullets';

type PlanIntentMode = 'signup' | 'login';

/**
 * Plan context when `?plan=` is a paid tier (Supabase catalog + config bullets).
 * Login uses a compact variant; primary CTA wording stays on the page, not here.
 */
export function PlanIntentSummary({
  mode = 'signup',
}: {
  mode?: PlanIntentMode;
}): JSX.Element | null {
  const [search] = useSearchParams();
  const planId = search.get('plan');
  const cadence = getCadenceFromSearch(search);
  const { plans, loading } = usePlanCatalog<typeof beakerstackBillingConfig>();

  const catalogPlan = useMemo(
    () => (planId ? plans.find(p => p.id === planId) : undefined),
    [plans, planId]
  );

  if (!planId || !hasPaidPlanIntent(search)) return null;

  if (loading) {
    return (
      <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm'>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          Loading plan…
        </p>
      </div>
    );
  }

  if (!catalogPlan || catalogPlan.price_cents === 0) return null;

  const isAnnual = cadence === 'annual' && catalogPlan.price_cents > 0;
  const annualCents = isAnnual
    ? annualListCentsFromSync(catalogPlan.id, catalogPlan.price_cents)
    : null;

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const priceHeadline =
    isAnnual && annualCents != null
      ? fmt(annualCents)
      : fmt(catalogPlan.price_cents);

  const priceSubline =
    cadence === 'annual' ? 'per year, billed annually' : 'per month';

  const savingsCopy = isAnnual
    ? planAnnualSavingsCopy(catalogPlan.id, catalogPlan.price_cents)
    : null;
  const savingsCallout = savingsCopy
    ? formatSavingsCalloutFromCopy(savingsCopy)
    : null;

  const bullets = planSignupBullets(catalogPlan.id).slice(
    0,
    mode === 'login' ? 2 : 3
  );

  return (
    <div
      className={
        mode === 'login'
          ? 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm'
          : 'rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-900/30 p-6 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-800'
      }
    >
      <p
        className={
          mode === 'login'
            ? 'text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400'
            : 'text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300'
        }
      >
        {mode === 'login' ? 'Plan from pricing' : 'Your selection'}
      </p>
      <h3
        className={
          mode === 'login'
            ? 'mt-1 text-lg font-semibold text-gray-900 dark:text-white'
            : 'mt-1 text-xl font-bold text-gray-900 dark:text-white'
        }
      >
        {catalogPlan.display_name}
      </h3>
      {savingsCallout ? (
        <p className='mt-1 text-xs font-semibold text-amber-900 dark:text-amber-300'>
          {savingsCallout}
        </p>
      ) : null}
      <div className='mt-3'>
        <p
          className={
            mode === 'login'
              ? 'text-xl font-bold text-gray-900 dark:text-white'
              : 'text-2xl font-bold text-gray-900 dark:text-white'
          }
        >
          {priceHeadline}
        </p>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          {priceSubline}
        </p>
      </div>
      {bullets.length > 0 ? (
        <ul className='mt-4 list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300'>
          {bullets.map((line, i) => (
            <li key={`${mode}-bullet-${i}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SignupPlanSummary() {
  return <PlanIntentSummary mode='signup' />;
}

export function LoginPlanSummary() {
  return <PlanIntentSummary mode='login' />;
}

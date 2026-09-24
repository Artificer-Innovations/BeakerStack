import { usePlanCatalog } from '@beakerstack/billing';
import { useMemo, type ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { resolveWaitlistModeCopy, useSignupMode } from '@beakerstack/waitlist';
import { billingConfig } from '@adopter/config/billing';
import { supabase } from '../../lib/supabase';
import { waitlistConfig } from '@adopter/config/waitlist';
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
}): ReactElement | null {
  const [search] = useSearchParams();
  const planId = search.get('plan');
  const cadence = getCadenceFromSearch(search);
  const { plans, loading } = usePlanCatalog<typeof billingConfig>();
  const {
    mode: signupMode,
    settings,
    loading: modeLoading,
    isInviteOnly,
    isClosed,
  } = useSignupMode(supabase);
  const modeCopy = resolveWaitlistModeCopy(settings?.copy, waitlistConfig.copy);

  const catalogPlan = useMemo(
    () => (planId ? plans.find(p => p.id === planId) : undefined),
    [plans, planId]
  );

  if (!planId || !hasPaidPlanIntent(search)) return null;

  if (modeLoading) return <PlanLoadingCard />;

  if (isInviteOnly || isClosed) return null;

  if (loading) return <PlanLoadingCard />;

  if (!catalogPlan || catalogPlan.price_cents === 0) return null;

  const { priceHeadline, priceSubline, savingsCallout } = resolvePriceView(
    catalogPlan.id,
    catalogPlan.price_cents,
    cadence
  );

  const bullets = planSignupBullets(catalogPlan.id).slice(
    0,
    mode === 'login' ? 2 : 3
  );

  const headerLabel =
    mode === 'login'
      ? 'Plan from pricing'
      : signupMode === 'waitlist'
        ? modeCopy.tier_panel_header
        : 'Your selection';

  return (
    <PlanIntentSummaryCard
      mode={mode}
      headerLabel={headerLabel}
      displayName={catalogPlan.display_name}
      savingsCallout={savingsCallout}
      priceHeadline={priceHeadline}
      priceSubline={priceSubline}
      bullets={bullets}
    />
  );
}

function resolvePriceView(
  planId: string,
  priceCents: number,
  cadence: ReturnType<typeof getCadenceFromSearch>
): {
  priceHeadline: string;
  priceSubline: string;
  savingsCallout: string | null;
} {
  const isAnnual = cadence === 'annual' && priceCents > 0;
  const annualCents = isAnnual
    ? annualListCentsFromSync(planId, priceCents)
    : null;

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const priceHeadline =
    isAnnual && annualCents != null ? fmt(annualCents) : fmt(priceCents);

  const priceSubline =
    cadence === 'annual' ? 'per year, billed annually' : 'per month';

  const savingsCopy = isAnnual
    ? planAnnualSavingsCopy(planId, priceCents)
    : null;
  const savingsCallout = savingsCopy
    ? formatSavingsCalloutFromCopy(savingsCopy)
    : null;

  return { priceHeadline, priceSubline, savingsCallout };
}

function PlanLoadingCard(): ReactElement {
  return (
    <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm'>
      <p className='text-sm text-gray-500 dark:text-gray-400'>Loading plan…</p>
    </div>
  );
}

function PlanIntentSummaryCard({
  mode,
  headerLabel,
  displayName,
  savingsCallout,
  priceHeadline,
  priceSubline,
  bullets,
}: {
  mode: PlanIntentMode;
  headerLabel: string;
  displayName: string;
  savingsCallout: string | null;
  priceHeadline: string;
  priceSubline: string;
  bullets: string[];
}): ReactElement {
  const isLogin = mode === 'login';
  return (
    <div
      className={
        isLogin
          ? 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm'
          : 'rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-900/30 p-6 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-800'
      }
    >
      <p
        className={
          isLogin
            ? 'text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400'
            : 'text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300'
        }
      >
        {headerLabel}
      </p>
      <h3
        className={
          isLogin
            ? 'mt-1 text-lg font-semibold text-gray-900 dark:text-white'
            : 'mt-1 text-xl font-bold text-gray-900 dark:text-white'
        }
      >
        {displayName}
      </h3>
      {savingsCallout ? (
        <p className='mt-1 text-xs font-semibold text-amber-900 dark:text-amber-300'>
          {savingsCallout}
        </p>
      ) : null}
      <div className='mt-3'>
        <p
          className={
            isLogin
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

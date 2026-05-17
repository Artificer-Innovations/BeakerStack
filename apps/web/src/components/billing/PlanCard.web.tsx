import type { BillingPlanConfig, Plan } from '@beakerstack/billing';
import { useBillingConfig } from '@beakerstack/billing';
import { Button } from '@beakerstack/shared/components/primitives/Button.web';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';
import type { DowngradeBlockersResult } from '@beakerstack/billing/presentation';
import { annualListCentsFromSync } from '@beakerstack/billing/presentation';
import { ConstraintWarning } from './ConstraintWarning.web';
import { PlanFeatureList } from './PlanFeatureList.web';

/**
 * v1: `public` mode reserved for a future /pricing page (CTA to signup, not checkout).
 */
export function PlanCard({
  plan,
  priceHeadline,
  priceSubline,
  subTag,
  savingsCallout,
  billingCadence = 'monthly',
  blockers = { hard: [], soft: [] },
  primary,
  mode = 'authenticated',
  /** e.g. "Scheduled" on the target plan when a downgrade is pending (billing UI v1 matrix). */
  supplementalBadge,
}: {
  plan: Plan;
  priceHeadline: string;
  priceSubline?: string;
  subTag?: string;
  /** Shown next to plan title in annual cadence (e.g. "2 Months Free"). */
  savingsCallout?: string | null;
  /** Used for trial copy ("then billed …"). */
  billingCadence?: 'monthly' | 'annual';
  /** Hard blockers disable the CTA; soft blockers are shown as warnings only (boolean entitlement loss). */
  blockers?: DowngradeBlockersResult;
  primary: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'secondary';
  };
  mode?: 'authenticated' | 'public';
  supplementalBadge?: string;
}): JSX.Element {
  void mode;
  const billingConfig = useBillingConfig<typeof beakerstackBillingConfig>();
  const cfgPlan = billingConfig.plans.find(p => p.id === plan.id) as
    | BillingPlanConfig
    | undefined;
  const { hard, soft } = blockers;
  const hasWarnings = hard.length > 0 || soft.length > 0;
  const hardBlocked = hard.length > 0;
  const tag =
    subTag ??
    cfgPlan?.planCardTagline ??
    cfgPlan?.description ??
    plan.description ??
    undefined;
  return (
    <div
      id={`plan-card-${plan.id}`}
      className='flex h-full flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm'
    >
      <div className='flex flex-wrap items-center gap-2'>
        <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>
          {plan.display_name}
        </h3>
        {supplementalBadge ? (
          <span className='shrink-0 rounded-md border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-900 dark:text-blue-200'>
            {supplementalBadge}
          </span>
        ) : null}
        {savingsCallout ? (
          <span className='shrink-0 rounded-md border border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/40 px-2 py-0.5 text-xs font-semibold text-rose-900 dark:text-rose-200'>
            {savingsCallout}
          </span>
        ) : null}
      </div>
      {tag ? (
        <p className='text-sm text-gray-500 dark:text-gray-400'>{tag}</p>
      ) : null}
      <div className='mt-4'>
        <p className='text-3xl font-bold text-gray-900 dark:text-white'>
          {priceHeadline}
        </p>
        {priceSubline && (
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {priceSubline}
          </p>
        )}
        {plan.price_cents > 0 && plan.trial_period_days > 0 ? (
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
            {plan.trial_period_days}-day trial, then billed{' '}
            {billingCadence === 'annual' ? 'annually' : 'monthly'} at this rate.
          </p>
        ) : null}
      </div>
      {hasWarnings && (
        <div className='mt-4 grow space-y-2'>
          {hard.map((m, i) => (
            <ConstraintWarning key={`h-${i}`} message={m} />
          ))}
          {soft.map((m, i) => (
            <ConstraintWarning key={`s-${i}`} message={m} />
          ))}
        </div>
      )}
      <div className={hasWarnings ? 'mt-2' : 'mt-6 grow'}>
        <PlanFeatureList plan={plan} />
      </div>
      <div className='mt-6'>
        <Button
          type='button'
          variant={primary.variant ?? 'primary'}
          onPress={primary.onClick}
          disabled={primary.disabled || hardBlocked}
          loading={primary.loading}
        >
          {hardBlocked ? 'Resolve issues to downgrade' : primary.label}
        </Button>
      </div>
    </div>
  );
}

/** Display price: monthly uses DB cents; annual uses yearly amount from billing-sync (Stripe). */
export function listPriceForPlan(plan: Plan, cadence: 'monthly' | 'annual') {
  if (plan.price_cents === 0)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(0);
  if (cadence === 'monthly') {
    return (
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(plan.price_cents / 100) + '/month'
    );
  }
  const annualCents = annualListCentsFromSync(plan.id, plan.price_cents);
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(annualCents / 100) + '/year, billed annually'
  );
}

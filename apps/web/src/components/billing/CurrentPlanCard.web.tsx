import { resolveCadence } from '@beakerstack/billing';
import type { Plan, SubscriptionRow } from '@beakerstack/billing';
import { SubscriptionStatusBadge } from '@beakerstack/billing/web';
import { Link } from 'react-router-dom';
import { Button } from '@beakerstack/shared/components/primitives/Button.web';
import {
  annualListCentsFromSync,
  formatDate,
  formatMoneyCents,
} from '@beakerstack/billing/presentation';

export function CurrentPlanCard({
  plan,
  subscription,
  isFree,
  onManagePayment,
  managePaymentPending = false,
  /** When set, replaces default renewal / trial / end copy for paid rows (e.g. scheduled downgrade). */
  periodSubcopy,
}: {
  plan: Plan | null;
  subscription: SubscriptionRow | null;
  isFree: boolean;
  onManagePayment: () => void;
  managePaymentPending?: boolean;
  periodSubcopy?: string | null;
}): JSX.Element | null {
  if (!plan) {
    return null;
  }
  const cadence = resolveCadence(plan, subscription);
  const priceLine =
    isFree || plan.price_cents === 0
      ? null
      : formatMoneyCents(
          cadence === 'annual'
            ? annualListCentsFromSync(plan.id, plan.price_cents)
            : plan.price_cents
        ) + (cadence === 'annual' ? '/year' : '/month');

  const periodEnd = subscription?.current_period_end
    ? formatDate(subscription.current_period_end)
    : '—';

  return (
    <div className='space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 shadow-sm'>
      {isFree ? (
        <>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
            You&apos;re on the Free plan
          </h2>
          <p className='text-sm text-gray-600 dark:text-gray-300'>
            Upgrade to unlock more capacity and features.
          </p>
        </>
      ) : (
        <>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
              {plan.display_name}
            </h2>
            {subscription && (
              <SubscriptionStatusBadge subscription={subscription} />
            )}
          </div>
          {priceLine && (
            <p className='text-base text-gray-600 dark:text-gray-300'>
              {priceLine}
            </p>
          )}
        </>
      )}
      {!isFree && subscription && (
        <p className='text-sm text-gray-600 dark:text-gray-300'>
          {periodSubcopy
            ? periodSubcopy
            : subscription.cancel_at_period_end
              ? `Ends on ${periodEnd}`
              : subscription.trial_end &&
                  (subscription.status === 'trialing' ||
                    new Date(subscription.trial_end) > new Date())
                ? `Trial — ends ${formatDate(subscription.trial_end)}`
                : `Renews on ${periodEnd}`}
        </p>
      )}
      <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
        <Link
          to='/billing/plans'
          className='inline-flex w-full min-h-[40px] sm:w-auto items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:inline-flex sm:min-w-[8rem]'
        >
          {isFree ? 'Upgrade to Pro' : 'Change plan'}
        </Link>
        {!isFree && subscription?.stripe_customer_id ? (
          <Button
            type='button'
            variant='secondary'
            onPress={onManagePayment}
            loading={managePaymentPending}
          >
            Manage payment &amp; invoices
          </Button>
        ) : null}
      </div>
    </div>
  );
}

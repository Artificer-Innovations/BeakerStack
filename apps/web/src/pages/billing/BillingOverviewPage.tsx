import {
  useCustomerPortal,
  useInvoices,
  usePlan,
  usePlanCatalog,
  useUsage,
  useBillingState,
  useBillingStripeActions,
  type SubscriptionRow,
  type BillingUiStateKind,
} from '@beakerstack/billing';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import { formatMonthYear } from '../../billing/formatters';
import { useDemoCollectionCount } from '../../billing/useDemoCollectionCount';
import { Banner } from '../../components/billing/Banner.web';
import { Button } from '@beakerstack/shared/components/primitives/Button.web';
import { BillingPageShell } from '../../components/billing/BillingPageShell.web';
import { BillingTabs } from '../../components/billing/BillingTabs.web';
import { CurrentPlanCard } from '../../components/billing/CurrentPlanCard.web';
import { InvoiceList } from '../../components/billing/InvoiceList.web';
import { StatCard } from '../../components/billing/StatCard.web';

export default function BillingOverviewPage() {
  const { kind, subscription } =
    useBillingState<typeof beakerstackBillingConfig>();
  const { plans: catalogPlans } =
    usePlanCatalog<typeof beakerstackBillingConfig>();
  const {
    reactivateSubscription,
    pending: stripeActionPend,
    error: stripeActionErr,
  } = useBillingStripeActions<typeof beakerstackBillingConfig>();
  const {
    openPortal,
    pending: portalPend,
    error: portalError,
  } = useCustomerPortal<typeof beakerstackBillingConfig>();
  const { data: currentPlan, loading: planLoad } =
    usePlan<typeof beakerstackBillingConfig>();
  const {
    used,
    limit,
    loading: usageLoad,
  } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);
  const { items: invoices, loading: invLoad } = useInvoices<
    typeof beakerstackBillingConfig
  >({ pageSize: 3 });
  const { count: colCount, loading: colLoad } = useDemoCollectionCount();
  const { user } = useAuthContext();

  const isFree =
    kind === 'free' ||
    currentPlan?.price_cents === 0 ||
    !subscription?.stripe_subscription_id;

  const pendingTargetName =
    subscription?.pending_target_plan_id != null
      ? catalogPlans.find(p => p.id === subscription.pending_target_plan_id)
          ?.display_name
      : undefined;

  const periodSubcopy =
    kind === 'downgrade_pending' &&
    subscription?.current_period_end &&
    pendingTargetName
      ? `You'll move to ${pendingTargetName} on ${new Date(
          subscription.current_period_end
        ).toLocaleDateString()}.`
      : null;

  return (
    <BillingPageShell>
      <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Billing</h1>
      <div className='mt-4'>
        <BillingTabs />
      </div>
      <div className='mt-6 space-y-6'>
        {portalError ? (
          <Banner variant='error' title='Could not open billing portal'>
            {portalError.message} For hosted deploys, ensure the Edge secret{' '}
            <code className='rounded bg-red-100 px-1 text-sm text-red-900'>
              BILLING_ALLOWED_ORIGINS
            </code>{' '}
            includes this site&apos;s origin.
          </Banner>
        ) : null}
        {stripeActionErr ? (
          <Banner variant='error' title='Subscription action failed'>
            {stripeActionErr.message}
          </Banner>
        ) : null}
        <OverviewBanners
          kind={kind}
          subscription={subscription}
          pendingTargetName={pendingTargetName}
          onReactivate={() =>
            void reactivateSubscription().then(() => window.location.reload())
          }
          reactivatePending={stripeActionPend}
        />
        {planLoad && kind === 'loading' ? (
          <div className='h-32 animate-pulse rounded-xl bg-gray-200' />
        ) : (
          <CurrentPlanCard
            plan={currentPlan}
            subscription={subscription}
            isFree={!!isFree}
            onManagePayment={() => void openPortal()}
            managePaymentPending={portalPend}
            periodSubcopy={periodSubcopy}
          />
        )}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <StatCard
            label="This month's usage"
            value={
              usageLoad
                ? '—'
                : limit === null
                  ? `${used} used (unlimited)`
                  : `${used} of ${limit} AI summaries`
            }
          />
          <StatCard
            label='Collections'
            value={
              colLoad
                ? '—'
                : (() => {
                    const cap = currentPlan?.features
                      .containers_per_account_max as number;
                    if (cap === -1) return `${colCount ?? 0} of unlimited`;
                    return `${colCount ?? 0} of ${cap}`;
                  })()
            }
          />
          <StatCard
            label='Member since'
            value={user?.created_at ? formatMonthYear(user.created_at) : '—'}
          />
        </div>
        {!isFree && !invLoad && invoices.length > 0 && (
          <InvoiceList items={invoices} limit={3} />
        )}
      </div>
    </BillingPageShell>
  );
}

function OverviewBanners({
  kind,
  subscription,
  pendingTargetName,
  onReactivate,
  reactivatePending,
}: {
  kind: BillingUiStateKind;
  subscription: SubscriptionRow | null;
  pendingTargetName?: string;
  onReactivate: () => void;
  reactivatePending: boolean;
}): JSX.Element | null {
  const reactivateAction = (
    <Button
      type='button'
      variant='secondary'
      onPress={onReactivate}
      loading={reactivatePending}
    >
      Reactivate subscription
    </Button>
  );

  if (kind === 'loading' || kind === 'no_subscription') return null;
  if (kind === 'payment_failed') {
    return (
      <Banner variant='error' title='Payment problem'>
        Your last payment did not go through. Use &quot;Manage payment &amp;
        invoices&quot; to update your card in the Stripe customer portal.
      </Banner>
    );
  }
  if (kind === 'downgrade_pending' && subscription?.current_period_end) {
    const target = pendingTargetName ?? 'your next plan';
    return (
      <Banner
        variant='info'
        title='Plan change scheduled'
        action={reactivateAction}
      >
        You&apos;ll be moved to {target} on{' '}
        {new Date(subscription.current_period_end).toLocaleDateString()}. You
        can reactivate your current subscription before then if you change your
        mind.
      </Banner>
    );
  }
  if (kind === 'cancelled_pending' && subscription?.current_period_end) {
    return (
      <Banner
        variant='warning'
        title='Subscription cancelled'
        action={reactivateAction}
      >
        Your subscription is cancelled and ends on{' '}
        {new Date(subscription.current_period_end).toLocaleDateString()}.
        Reactivate to keep your current plan, or manage billing in the customer
        portal.
      </Banner>
    );
  }
  return null;
}

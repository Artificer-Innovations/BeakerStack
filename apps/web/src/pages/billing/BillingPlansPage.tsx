import type { Plan } from '@beakerstack/billing';
import {
  resolveCadence,
  useBillingState,
  useBillingStripeActions,
  useCheckout,
  usePlan,
  usePlanCatalog,
  useSubscription,
  useUsage,
} from '@beakerstack/billing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  beakerstackBillingConfig,
  BEAKERSTACK_METER_AI_SUMMARIZE,
} from '../../billing/beakerstackBillingConfig';
import {
  annualListCentsFromSync,
  computeDowngradeBlockers,
  formatSavingsCalloutFromCopy,
  planAnnualSavingsCopy,
  type DowngradeBlockersResult,
} from '@beakerstack/billing/presentation';
import { useDemoCollectionCount } from '../../billing/useDemoCollectionCount';
import {
  CadenceToggle,
  getCadenceFromSearch,
} from '../../components/billing/CadenceToggle.web';
import { BillingPageShell } from '../../components/billing/BillingPageShell.web';
import { BillingTabs } from '../../components/billing/BillingTabs.web';
import { ConfirmDowngradeModal } from '../../components/billing/ConfirmDowngradeModal.web';
import { PlanCard } from '../../components/billing/PlanCard.web';

type Primary = {
  label: string;
  /** Omitted for disabled CTAs that never fire (e.g. the current plan or a tied cadence). */
  onClick?: () => void;
  disabled: boolean;
  loading: boolean;
  variant?: 'primary' | 'secondary';
};

export default function BillingPlansPage() {
  const [search, setSearchParams] = useSearchParams();
  const cadence = getCadenceFromSearch(search);
  const [welcomeSnapshot] = useState(() => ({
    showBanner: search.get('welcome') === '1' && Boolean(search.get('plan')),
    planId: search.get('plan'),
  }));
  const { plans, loading: catLoad } =
    usePlanCatalog<typeof beakerstackBillingConfig>();
  const { data: current } = usePlan<typeof beakerstackBillingConfig>();
  const { data: subscription } =
    useSubscription<typeof beakerstackBillingConfig>();
  const { kind: billingKind } =
    useBillingState<typeof beakerstackBillingConfig>();
  const { startCheckout, pending: checkoutPend } =
    useCheckout<typeof beakerstackBillingConfig>();
  const {
    updateSubscription,
    scheduleCancelToFree,
    pending: actionPend,
  } = useBillingStripeActions<typeof beakerstackBillingConfig>();
  const { used: aiUsed } = useUsage<
    typeof beakerstackBillingConfig,
    typeof BEAKERSTACK_METER_AI_SUMMARIZE
  >(BEAKERSTACK_METER_AI_SUMMARIZE);
  const { count: colCount = 0, maxItemsInAnyCollection = 0 } =
    useDemoCollectionCount();

  const [modal, setModal] = useState(false);
  const pending = checkoutPend || actionPend;

  const welcomePlanId = welcomeSnapshot.planId;
  const welcomeFromPricing =
    welcomeSnapshot.showBanner &&
    Boolean(welcomePlanId) &&
    plans.some(p => p.id === welcomePlanId);

  const searchKey = search.toString();

  useEffect(() => {
    const sp = new URLSearchParams(searchKey);
    if (sp.get('welcome') !== '1' || !welcomePlanId || catLoad) return;
    document
      .getElementById(`plan-card-${welcomePlanId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    sp.delete('welcome');
    setSearchParams(sp, { replace: true });
  }, [searchKey, setSearchParams, welcomePlanId, catLoad]);

  const welcomePlanMeta = useMemo(
    () => (welcomePlanId ? plans.find(p => p.id === welcomePlanId) : undefined),
    [plans, welcomePlanId]
  );

  const currentCadence = useMemo(
    () =>
      current && subscription ? resolveCadence(current, subscription) : null,
    [current, subscription]
  );
  const hasPaidStripe = Boolean(subscription?.stripe_subscription_id);

  const emptyBlockers = (): DowngradeBlockersResult => ({
    hard: [],
    soft: [],
  });

  const blockers = useCallback(
    (target: Plan) => {
      if (!current) return emptyBlockers();
      if (target.id === current.id) return emptyBlockers();
      if (
        target.id === 'beakerstack_free' &&
        (current.id !== 'beakerstack_free' || hasPaidStripe)
      ) {
        return computeDowngradeBlockers(
          current,
          target,
          {
            collectionCount: colCount ?? 0,
            maxItemsInAnyCollection: maxItemsInAnyCollection ?? 0,
            aiUsedThisPeriod: aiUsed ?? 0,
          },
          plans,
          beakerstackBillingConfig
        );
      }
      if (
        (target.display_order ?? 0) < (current.display_order ?? 0) &&
        target.id !== 'beakerstack_free'
      ) {
        return computeDowngradeBlockers(
          current,
          target,
          {
            collectionCount: colCount ?? 0,
            maxItemsInAnyCollection: maxItemsInAnyCollection ?? 0,
            aiUsedThisPeriod: aiUsed ?? 0,
          },
          plans,
          beakerstackBillingConfig
        );
      }
      return emptyBlockers();
    },
    [current, colCount, maxItemsInAnyCollection, aiUsed, hasPaidStripe, plans]
  );

  const getPrimary = useCallback(
    (p: Plan): Primary => {
      if (!current) {
        return {
          label: '…',
          disabled: true,
          loading: false,
        };
      }
      const b = blockers(p);
      const hasHardBlock = b.hard.length > 0;
      if (p.id === current.id) {
        if (p.price_cents === 0 || p.id === 'beakerstack_free') {
          return {
            label: 'Current plan',
            disabled: true,
            loading: false,
          };
        }
        if (currentCadence === cadence) {
          return {
            label: 'Current plan',
            disabled: true,
            loading: false,
          };
        }
        return {
          label:
            cadence === 'annual' ? 'Switch to annual' : 'Switch to monthly',
          onClick: async () => {
            const r = await updateSubscription(p.id, cadence);
            if (r) window.location.reload();
          },
          disabled: false,
          loading: pending,
        };
      }
      if (!hasPaidStripe && p.price_cents > 0) {
        const trialDays = p.trial_period_days ?? 0;
        const label =
          trialDays > 0
            ? `Start ${trialDays}-day free trial`
            : `Upgrade to ${p.display_name}`;
        return {
          label,
          onClick: async () => {
            const r = await startCheckout(p.id, cadence);
            if (r?.checkoutUrl) window.location.href = r.checkoutUrl;
          },
          disabled: false,
          loading: pending,
        };
      }
      if (p.id === 'beakerstack_free' && hasPaidStripe) {
        return {
          label: 'Downgrade to Free',
          onClick: () => setModal(true),
          disabled: hasHardBlock,
          loading: false,
          variant: 'secondary',
        };
      }
      if (hasPaidStripe && p.price_cents > 0) {
        if ((p.display_order ?? 0) > (current.display_order ?? 0)) {
          return {
            label: `Upgrade to ${p.display_name}`,
            onClick: () =>
              void updateSubscription(p.id, cadence).then(() =>
                window.location.reload()
              ),
            disabled: false,
            loading: pending,
          };
        }
        if ((p.display_order ?? 0) < (current.display_order ?? 0)) {
          return {
            label: `Downgrade to ${p.display_name}`,
            onClick: () =>
              void updateSubscription(p.id, cadence).then(() =>
                window.location.reload()
              ),
            disabled: hasHardBlock,
            loading: pending,
            variant: 'secondary',
          };
        }
      }
      return {
        label: 'Current plan',
        disabled: true,
        loading: false,
      };
    },
    [
      current,
      blockers,
      currentCadence,
      cadence,
      hasPaidStripe,
      startCheckout,
      updateSubscription,
      pending,
    ]
  );

  return (
    <BillingPageShell>
      <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
        Billing
      </h1>
      <div className='mt-4'>
        <BillingTabs />
      </div>
      <h2 className='mt-6 text-xl font-semibold text-gray-900 dark:text-white'>
        Choose a plan
      </h2>
      <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
        Switch plans or update your billing cadence anytime.
      </p>
      <div className='mt-6'>
        <CadenceToggle />
      </div>
      {welcomeFromPricing && welcomePlanMeta ? (
        <div
          role='status'
          className='mt-6 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 text-sm text-indigo-950 dark:text-indigo-100'
        >
          <p className='font-medium'>
            You&apos;re almost there — finish checkout for{' '}
            {welcomePlanMeta.display_name}
          </p>
          <p className='mt-1 text-indigo-900/90 dark:text-indigo-200'>
            {cadence === 'annual'
              ? 'Annual billing is selected below. Use Upgrade to start checkout when you are ready.'
              : 'Monthly billing is selected below. Use Upgrade to start checkout when you are ready.'}
          </p>
        </div>
      ) : null}
      {catLoad ? (
        <p className='mt-8 text-sm text-gray-500 dark:text-gray-400'>
          Loading plans…
        </p>
      ) : (
        <div className='mt-8 grid grid-cols-1 gap-6 md:grid-cols-3'>
          {plans.map(p => {
            const displayCents =
              p.price_cents === 0
                ? 0
                : cadence === 'annual'
                  ? annualListCentsFromSync(p.id, p.price_cents)
                  : p.price_cents;
            const head = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(displayCents / 100);
            const sub =
              p.price_cents === 0
                ? 'Free forever'
                : cadence === 'monthly'
                  ? 'per month'
                  : 'per year, billed annually';
            const pr = getPrimary(p);
            const savingsCallout =
              cadence === 'annual' && p.price_cents > 0
                ? formatSavingsCalloutFromCopy(
                    planAnnualSavingsCopy(p.id, p.price_cents)
                  )
                : null;
            return (
              <PlanCard
                key={p.id}
                plan={p}
                priceHeadline={head}
                priceSubline={sub}
                savingsCallout={savingsCallout}
                billingCadence={cadence}
                blockers={blockers(p)}
                primary={pr}
                mode='authenticated'
                supplementalBadge={
                  billingKind === 'downgrade_pending' &&
                  subscription?.pending_target_plan_id === p.id
                    ? 'Scheduled'
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
      <p className='mt-8 text-center text-xs text-gray-500 dark:text-gray-400'>
        All plans billed in USD. Taxes calculated at checkout where applicable.
        Cancel anytime. Plans with a trial convert to paid at trial end unless
        you cancel before then (manage in Stripe customer portal).
      </p>
      <ConfirmDowngradeModal
        open={modal}
        onClose={() => setModal(false)}
        onConfirm={async () => {
          const ok = await scheduleCancelToFree();
          if (ok) {
            setModal(false);
            window.location.reload();
          }
        }}
        planName='Free'
        bodyText="Your paid subscription is scheduled to cancel. You'll be on the Free plan when the current period ends."
        pending={actionPend}
      />
    </BillingPageShell>
  );
}

import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BillingConfigProvider } from '@beakerstack/billing';
import {
  formatWaitlistPricingCta,
  resolveWaitlistModeCopy,
  useSignupMode,
} from '@beakerstack/waitlist';
import { beakerstackBillingConfig } from '../../../billing/beakerstackBillingConfig';
import { getStaticPlans } from '../../../billing/staticPlanAdapter';
import { PlanCard } from '../../billing/PlanCard.web';
import {
  CadenceToggle,
  getCadenceFromSearch,
} from '../../billing/CadenceToggle.web';
import {
  annualListCentsFromSync,
  planAnnualSavingsCopy,
  formatSavingsCalloutFromCopy,
} from '@beakerstack/billing/presentation';
import type { LandingConfig } from '../../../config/landing';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { supabase } from '../../../lib/supabase';
import { beakerstackWaitlistConfig } from '../../../waitlist/beakerstackWaitlistConfig';
import type { SignupMode } from '@beakerstack/waitlist';

interface PricingSectionProps {
  config: LandingConfig['pricing'];
}

function signupUrl(planId: string, cadence: 'monthly' | 'annual') {
  const q = new URLSearchParams({ plan: planId });
  if (cadence === 'annual') q.set('cadence', 'annual');
  return `/signup?${q.toString()}`;
}

function openModeCtaLabel(plan: { display_name: string; price_cents: number }) {
  if (plan.price_cents === 0) return 'Get started free';
  return `Get started with ${plan.display_name}`;
}

function StaticPricingTable({
  mode,
  modeCopy,
}: {
  mode: SignupMode;
  modeCopy: ReturnType<typeof resolveWaitlistModeCopy>;
}) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const cadence = getCadenceFromSearch(search);
  const plans = useMemo(() => getStaticPlans(), []);
  const showCtas = mode === 'open' || mode === 'waitlist';

  return (
    <div>
      <div className='mb-8'>
        <CadenceToggle plans={plans} />
      </div>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        {plans.map(plan => {
          const isAnnual = cadence === 'annual' && plan.price_cents > 0;
          const annualCents = isAnnual
            ? annualListCentsFromSync(plan.id, plan.price_cents)
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
              : fmt(plan.price_cents);

          const priceSubline =
            plan.price_cents === 0
              ? 'Free forever'
              : isAnnual
                ? 'per year'
                : 'per month';

          const savingsCopy = isAnnual
            ? planAnnualSavingsCopy(plan.id, plan.price_cents)
            : null;
          const savingsCallout = savingsCopy
            ? formatSavingsCalloutFromCopy(savingsCopy)
            : null;

          const primary = showCtas
            ? {
                label:
                  mode === 'waitlist'
                    ? formatWaitlistPricingCta(
                        modeCopy.pricing_cta_label,
                        plan.display_name
                      )
                    : openModeCtaLabel(plan),
                onClick: () => navigate(signupUrl(plan.id, cadence)),
              }
            : undefined;

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              priceHeadline={priceHeadline}
              priceSubline={priceSubline}
              savingsCallout={savingsCallout}
              billingCadence={isAnnual ? 'annual' : 'monthly'}
              primary={primary}
              mode='public'
            />
          );
        })}
      </div>
    </div>
  );
}

export function PricingSection({ config }: PricingSectionProps) {
  const { mode, settings, loading } = useSignupMode(supabase);
  const modeCopy = resolveWaitlistModeCopy(
    settings?.copy,
    beakerstackWaitlistConfig.copy
  );

  if (!loading && mode === 'closed') {
    return null;
  }

  return (
    <section
      id='pricing'
      className='py-20 md:py-24 bg-gray-50 dark:bg-gray-900'
    >
      <ContentContainer>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-3'>
            {config.heading}
          </h2>
          <p className='text-lg text-gray-600 dark:text-gray-400'>
            {config.subhead}
          </p>
        </div>
        {loading ? (
          <div className='flex justify-center py-12' aria-busy='true'>
            <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600' />
          </div>
        ) : (
          <BillingConfigProvider config={beakerstackBillingConfig}>
            <StaticPricingTable mode={mode} modeCopy={modeCopy} />
          </BillingConfigProvider>
        )}
        {config.disclaimer && !loading ? (
          <p className='mt-8 text-center text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto'>
            {config.disclaimer}
          </p>
        ) : null}
      </ContentContainer>
    </section>
  );
}

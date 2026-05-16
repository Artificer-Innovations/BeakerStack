import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BillingConfigProvider } from '@beakerstack/billing';
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

interface PricingSectionProps {
  config: LandingConfig['pricing'];
}

function StaticPricingTable() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const cadence = getCadenceFromSearch(search);
  const plans = useMemo(() => getStaticPlans(), []);

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
            plan.price_cents === 0
              ? 'US$0'
              : isAnnual && annualCents != null
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

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              priceHeadline={priceHeadline}
              priceSubline={priceSubline}
              savingsCallout={savingsCallout}
              billingCadence={isAnnual ? 'annual' : 'monthly'}
              primary={{
                label:
                  plan.price_cents === 0
                    ? 'Get started free'
                    : `Get started with ${plan.display_name}`,
                onClick: () =>
                  navigate(
                    `/signup?plan=${encodeURIComponent(plan.id)}${cadence === 'annual' ? '&cadence=annual' : ''}`
                  ),
              }}
              mode='public'
            />
          );
        })}
      </div>
    </div>
  );
}

export function PricingSection({ config }: PricingSectionProps) {
  return (
    <section
      id='pricing'
      className='py-20 md:py-24 bg-gray-50 dark:bg-gray-900'
    >
      <div className='max-w-[1200px] mx-auto px-6'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-3'>
            {config.heading}
          </h2>
          <p className='text-lg text-gray-600 dark:text-gray-400'>
            {config.subhead}
          </p>
        </div>
        <BillingConfigProvider config={beakerstackBillingConfig}>
          <StaticPricingTable />
        </BillingConfigProvider>
        {config.disclaimer && (
          <p className='mt-8 text-center text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto'>
            {config.disclaimer}
          </p>
        )}
      </div>
    </section>
  );
}

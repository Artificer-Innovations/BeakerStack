import { useNavigate } from 'react-router-dom';
import { BillingProvider, usePlanCatalog } from '@beakerstack/billing';
import { supabase } from '../../../lib/supabase';
import { beakerstackBillingConfig } from '../../../billing/beakerstackBillingConfig';
import { PlanCard } from '../../billing/PlanCard.web';
import type { LandingConfig } from '../../../config/landing';

interface PricingSectionProps {
  config: LandingConfig['pricing'];
}

function appBasePath(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}`;
}

function LandingPricingTable() {
  const navigate = useNavigate();
  const { plans, loading } = usePlanCatalog<typeof beakerstackBillingConfig>();

  if (loading) {
    return <p className='mt-8 text-center text-sm text-gray-500'>Loading plans…</p>;
  }

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
      {plans.map(plan => {
        const priceHeadline =
          plan.price_cents === 0
            ? 'US$0'
            : new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(plan.price_cents / 100);
        const priceSubline =
          plan.price_cents === 0 ? 'Free forever' : 'per month';

        return (
          <PlanCard
            key={plan.id}
            plan={plan}
            priceHeadline={priceHeadline}
            priceSubline={priceSubline}
            primary={{
              label:
                plan.price_cents === 0
                  ? 'Get started free'
                  : `Get started with ${plan.display_name}`,
              onClick: () =>
                navigate(`/signup?plan=${encodeURIComponent(plan.id)}`),
            }}
            mode='public'
          />
        );
      })}
    </div>
  );
}

export function PricingSection({ config }: PricingSectionProps) {
  const base = appBasePath();

  return (
    <section id='pricing' className='py-20 md:py-24 bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-[1200px] mx-auto px-6'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-3'>
            {config.heading}
          </h2>
          <p className='text-lg text-gray-600 dark:text-gray-400'>{config.subhead}</p>
        </div>
        <BillingProvider<typeof beakerstackBillingConfig>
          supabase={supabase}
          config={beakerstackBillingConfig}
          checkoutSuccessUrl={`${base}/billing?checkout=success`}
          checkoutCancelUrl={`${base}/billing/plans?checkout=cancel`}
          portalReturnUrl={`${base}/billing`}
        >
          <LandingPricingTable />
        </BillingProvider>
        {config.disclaimer && (
          <p className='mt-8 text-center text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto'>
            {config.disclaimer}
          </p>
        )}
      </div>
    </section>
  );
}

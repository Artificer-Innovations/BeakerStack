import { useNavigate } from 'react-router-dom';
import { BillingProvider } from '@beakerstack/billing';
import { PricingTable } from '@beakerstack/billing/web';
import { supabase } from '../../../lib/supabase';
import { beakerstackBillingConfig } from '../../../billing/beakerstackBillingConfig';
import type { LandingConfig } from '../../../config/landing';

interface PricingSectionProps {
  config: LandingConfig['pricing'];
}

function appBasePath(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}`;
}

export function PricingSection({ config }: PricingSectionProps) {
  const navigate = useNavigate();
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
          <PricingTable
            isAuthenticated={false}
            onCheckout={planId => {
              navigate(`/signup?plan=${encodeURIComponent(planId)}`);
            }}
          />
        </BillingProvider>
      </div>
    </section>
  );
}

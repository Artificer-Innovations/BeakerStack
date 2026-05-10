import { Link } from 'react-router-dom';
import { beakerstackBillingConfig } from '../../../billing/beakerstackBillingConfig';
import type { LandingConfig } from '../../../config/landing';

interface PricingSectionProps {
  config: LandingConfig['pricing'];
}

function formatPrice(priceCents: number, billingPeriod: string): string {
  if (billingPeriod === 'free') return 'Free';
  return `$${(priceCents / 100).toFixed(0)} / mo`;
}

export function PricingSection({ config }: PricingSectionProps) {
  const plans = beakerstackBillingConfig.plans.filter(p => p.isPublic);

  return (
    <section id='pricing' className='py-20 md:py-24 bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-[1200px] mx-auto px-6'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-3'>
            {config.heading}
          </h2>
          <p className='text-lg text-gray-600 dark:text-gray-400'>{config.subhead}</p>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto'>
          {plans.map(plan => (
            <div
              key={plan.id}
              className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 flex flex-col'
            >
              <div className='mb-6'>
                <p className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
                  {plan.planCardTagline}
                </p>
                <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
                  {plan.displayName}
                </h3>
                <p className='text-3xl font-bold text-gray-900 dark:text-white'>
                  {formatPrice(plan.priceCents, plan.billingPeriod)}
                </p>
              </div>
              <Link
                to={`/signup?plan=${plan.id}`}
                className='mt-auto inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors'
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

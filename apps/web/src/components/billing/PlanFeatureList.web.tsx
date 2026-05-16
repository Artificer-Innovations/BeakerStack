import { Check, X } from 'lucide-react';
import type { Plan } from '@beakerstack/billing';
import { useBillingConfig } from '@beakerstack/billing';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';
import {
  mergePlanFeatureRows,
  planFeatureLine,
} from '@beakerstack/billing/presentation';

/**
 * “What’s included” list for a plan card (or future public pricing).
 * Rows and labels come from `beakerstackBillingConfig.planFeatureRows` with
 * defaults in `@beakerstack/billing/presentation` (`planPresentation`).
 */
export function PlanFeatureList({
  plan,
  mode = 'authenticated',
}: {
  plan: Plan;
  mode?: 'authenticated' | 'public';
}): JSX.Element {
  void mode;
  const billingConfig = useBillingConfig<typeof beakerstackBillingConfig>();
  const rows = mergePlanFeatureRows(billingConfig);

  return (
    <div>
      <p className='mb-2 text-sm font-medium text-gray-900 dark:text-white'>
        What&apos;s included
      </p>
      <ul className='space-y-1.5 text-sm text-gray-600 dark:text-gray-400'>
        {rows.map(row => {
          const { ok, text } = planFeatureLine(plan, row);
          return (
            <li key={row.id} className='flex items-start gap-2'>
              {ok ? (
                <Check
                  className='mt-0.5 h-4 w-4 shrink-0 text-green-600'
                  aria-hidden
                />
              ) : (
                <X
                  className='mt-0.5 h-4 w-4 shrink-0 text-gray-300 dark:text-gray-500'
                  aria-hidden
                />
              )}
              <span>{text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

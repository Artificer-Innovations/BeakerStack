import { BillingProvider } from '@beakerstack/billing';
import { Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { beakerstackBillingConfig } from './beakerstackBillingConfig';

function appBasePath(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}`;
}

/**
 * Wraps `/dashboard` and `/billing/*` with a single {@link BillingProvider} (shared subscription state).
 */
export function BillingProviderLayout() {
  const base = appBasePath();
  return (
    <BillingProvider<typeof beakerstackBillingConfig>
      supabase={supabase}
      config={beakerstackBillingConfig}
      checkoutSuccessUrl={`${base}/billing?checkout=success`}
      checkoutCancelUrl={`${base}/billing/plans?checkout=cancel`}
      portalReturnUrl={`${base}/billing`}
    >
      <Outlet />
    </BillingProvider>
  );
}

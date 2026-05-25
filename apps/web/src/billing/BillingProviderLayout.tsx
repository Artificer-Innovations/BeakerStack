import { BillingProvider } from '@beakerstack/billing';
import { Outlet } from 'react-router-dom';
import { appBasePath } from '../lib/appBasePath';
import { supabase } from '../lib/supabase';
import { billingConfig } from '@adopter/config/billing';

/**
 * Wraps `/dashboard` and `/billing/*` with a single {@link BillingProvider} (shared subscription state).
 */
export function BillingProviderLayout() {
  const base = appBasePath();
  return (
    <BillingProvider<typeof billingConfig>
      supabase={supabase}
      config={billingConfig}
      checkoutSuccessUrl={`${base}/billing?checkout=success`}
      checkoutCancelUrl={`${base}/billing/plans?checkout=cancel`}
      portalReturnUrl={`${base}/billing`}
    >
      <Outlet />
    </BillingProvider>
  );
}

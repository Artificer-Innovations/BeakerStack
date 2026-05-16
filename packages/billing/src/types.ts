import type { BillingError } from './errors.js';
import type { ProductBillingConfig } from './schema.js';

export type PlanId = string;

/** Plan row from DB (subset used by hooks). */
export type Plan = {
  id: string;
  product_id: string;
  display_name: string;
  description: string | null;
  price_cents: number;
  billing_period: string;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  stripe_product_id: string | null;
  features: Record<string, boolean | number>;
  usage_limits: Record<string, number>;
  trial_period_days: number;
  is_public: boolean;
  display_order: number;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  product_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  /** Stripe Price id for the current subscription (monthly or annual). */
  stripe_price_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  /** When set with `cancel_at_period_end`, user is scheduled to move to this plan (e.g. free). */
  pending_target_plan_id: string | null;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
};

/** Row from `billing_invoices` (client read-only). */
export type BillingInvoiceRow = {
  id: string;
  user_id: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  description: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  finalized_at: string | null;
  paid_at: string | null;
};

export type UsageSnapshot = {
  used: number;
  limit: number | null;
  remaining: number | null;
  periodEnd: string;
  periodStart: string;
};

export type BillingContextValue<
  P extends ProductBillingConfig = ProductBillingConfig,
> = {
  supabase: import('@supabase/supabase-js').SupabaseClient;
  config: P;
  userId: string | null;
  subscription: SubscriptionRow | null;
  subscriptionLoading: boolean;
  subscriptionError: BillingError | null;
  refreshSubscription: () => Promise<void>;
  plan: Plan | null;
  planLoading: boolean;
  planError: BillingError | null;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
  portalReturnUrl: string;
  stripeFunctionName: string;
};

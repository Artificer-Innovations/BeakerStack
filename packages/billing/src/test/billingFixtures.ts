import { defineBillingConfig } from '../schema.js';
import type { Plan, SubscriptionRow } from '../types.js';

export const testBillingConfig = defineBillingConfig({
  productId: 'test_product',
  displayName: 'Test',
  plans: [
    {
      id: 'plan_free',
      displayName: 'Free',
      priceCents: 0,
      billingPeriod: 'free',
      stripePriceIdMonthly: null,
      stripePriceIdAnnual: null,
      stripeProductId: null,
      features: { feature_x: true, num: 3 },
      usageLimits: { ai: 10 },
    },
  ],
});

export function testPlan(over: Partial<Plan> = {}): Plan {
  return {
    id: 'plan_free',
    product_id: 'test_product',
    display_name: 'Free',
    description: null,
    price_cents: 0,
    billing_period: 'free',
    stripe_price_id_monthly: 'price_monthly',
    stripe_price_id_annual: 'price_annual',
    stripe_product_id: null,
    features: { feature_x: true, num: 3 },
    usage_limits: { ai: 10 },
    trial_period_days: 0,
    is_public: true,
    display_order: 1,
    ...over,
  };
}

export function testSubscription(
  over: Partial<SubscriptionRow> = {}
): SubscriptionRow {
  return {
    id: 'sub_1',
    user_id: 'user_1',
    product_id: 'test_product',
    plan_id: 'plan_free',
    stripe_customer_id: 'cus_1',
    stripe_subscription_id: 'sub_stripe',
    stripe_price_id: 'price_monthly',
    status: 'active',
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    pending_target_plan_id: null,
    canceled_at: null,
    trial_start: null,
    trial_end: null,
    ...over,
  };
}

export function baseBillingContextExtras() {
  return {
    supabase: {} as import('@supabase/supabase-js').SupabaseClient,
    config: testBillingConfig,
    userId: 'user_1' as string | null,
    subscriptionError: null,
    refreshSubscription: (): Promise<void> => Promise.resolve(),
    checkoutSuccessUrl: 'https://example.com/success',
    checkoutCancelUrl: 'https://example.com/cancel',
    portalReturnUrl: 'https://example.com/portal',
    stripeFunctionName: 'billing-stripe',
  };
}

import type { Plan, BillingPlanConfig } from '@beakerstack/billing';
import { billingConfig } from '@adopter/config/billing';

export function configPlanToStaticPlan(
  plan: BillingPlanConfig,
  index: number
): Plan {
  return {
    id: plan.id,
    product_id: billingConfig.productId,
    display_name: plan.displayName,
    description: plan.description ?? null,
    price_cents: plan.priceCents,
    billing_period: plan.billingPeriod,
    stripe_price_id_monthly: plan.stripePriceIdMonthly ?? null,
    stripe_price_id_annual: plan.stripePriceIdAnnual ?? null,
    stripe_product_id: plan.stripeProductId ?? null,
    features: plan.features as Record<string, boolean | number>,
    usage_limits: plan.usageLimits as Record<string, number>,
    trial_period_days: plan.trialPeriodDays ?? 0,
    is_public: plan.isPublic ?? true,
    display_order: plan.displayOrder ?? index,
  };
}

export function getStaticPlans(): Plan[] {
  return (billingConfig.plans as BillingPlanConfig[])
    .filter(p => p.isPublic !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((p, i) => configPlanToStaticPlan(p, i));
}

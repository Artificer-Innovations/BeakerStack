import {
  defineBillingConfig,
  type InferFeatureKeys,
} from '@beakerstack/billing';
import { BRANDING } from '@beakerstack/shared/config/branding';

/**
 * Template-owned billing config (Free / Pro / Max). IDs match `supabase/seed.sql`.
 * Downstream clones rename keys and copy here — do not embed in `@beakerstack/billing`.
 * Stripe price IDs live in `public.billing_plans` (synced via `npm run billing:sync-stripe` from the web app config).
 */
export const beakerstackBillingConfig = defineBillingConfig({
  productId: 'beakerstack',
  displayName: BRANDING.displayName,
  description: 'Template demo',
  plans: [
    {
      id: 'beakerstack_free',
      displayName: 'Free',
      description: 'Starter',
      planCardTagline: 'For getting started',
      priceCents: 0,
      billingPeriod: 'free',
      stripePriceIdMonthly: null,
      stripePriceIdAnnual: null,
      stripeProductId: null,
      features: {
        containers_per_account_max: 2,
        items_per_container_max: 3,
        feature_a: false,
        feature_b: false,
      },
      usageLimits: {
        ai_summarize: 30,
      },
      trialPeriodDays: 0,
      isPublic: true,
      displayOrder: 1,
    },
    {
      id: 'beakerstack_pro',
      displayName: 'Pro',
      description: 'More capacity',
      planCardTagline: 'For active users',
      priceCents: 1900,
      billingPeriod: 'monthly',
      stripePriceIdMonthly: null,
      stripePriceIdAnnual: null,
      stripeProductId: null,
      features: {
        containers_per_account_max: -1,
        items_per_container_max: 25,
        feature_a: true,
        feature_b: false,
      },
      usageLimits: {
        ai_summarize: 500,
      },
      trialPeriodDays: 0,
      isPublic: true,
      displayOrder: 2,
    },
    {
      id: 'beakerstack_max',
      displayName: 'Max',
      description: 'Everything',
      planCardTagline: 'For power users',
      priceCents: 4900,
      billingPeriod: 'monthly',
      stripePriceIdMonthly: null,
      stripePriceIdAnnual: null,
      stripeProductId: null,
      features: {
        containers_per_account_max: -1,
        items_per_container_max: -1,
        feature_a: true,
        feature_b: true,
      },
      usageLimits: {
        ai_summarize: -1,
      },
      trialPeriodDays: 5,
      isPublic: true,
      displayOrder: 3,
    },
  ],
});

export type BeakerstackBillingConfig = typeof beakerstackBillingConfig;

export const BEAKERSTACK_METER_AI_SUMMARIZE = 'ai_summarize' as const;

export type BeakerstackFeatureKey = InferFeatureKeys<
  typeof beakerstackBillingConfig
>;

import {
  defineBillingConfig,
  type InferFeatureKeys,
} from '@beakerstack/billing';
import { branding } from './branding';
import { appIdentity } from './app-identity';

const beakerstackMaxFeatures = {
  containers_per_account_max: -1,
  items_per_container_max: -1,
  feature_a: true,
  feature_b: true,
} as const;

const beakerstackMaxUsageLimits = {
  ai_summarize: -1,
} as const;

/**
 * Adopter-owned billing config (Free / Pro / Max). IDs match `supabase/seed.sql`.
 * Stripe price IDs live in `public.billing_plans` (synced via `npm run billing:sync-stripe`).
 */
export const billingConfig = defineBillingConfig({
  productId: appIdentity.productId,
  displayName: branding.displayName,
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
      features: { ...beakerstackMaxFeatures },
      usageLimits: { ...beakerstackMaxUsageLimits },
      trialPeriodDays: 5,
      isPublic: true,
      displayOrder: 3,
    },
    {
      id: 'beakerstack_vip',
      displayName: 'VIP (complimentary)',
      description:
        'Complimentary Max-equivalent access (operator-granted only)',
      planCardTagline: 'Complimentary access',
      priceCents: 0,
      billingPeriod: 'monthly',
      stripePriceIdMonthly: null,
      stripePriceIdAnnual: null,
      stripeProductId: null,
      features: { ...beakerstackMaxFeatures },
      usageLimits: { ...beakerstackMaxUsageLimits },
      trialPeriodDays: 0,
      isPublic: false,
      displayOrder: 99,
    },
  ],
  planFeatureRows: [
    {
      id: 'feature_a',
      featureKey: 'feature_a',
      kind: 'boolean',
      label: 'Feature A',
    },
    {
      id: 'feature_b',
      featureKey: 'feature_b',
      kind: 'boolean',
      label: 'Feature B',
    },
    {
      id: 'containers',
      featureKey: 'containers_per_account_max',
      kind: 'number',
      unlimitedLabel: 'Unlimited collections',
      limitedLabelTemplate: 'Up to {count} collections',
    },
    {
      id: 'items',
      featureKey: 'items_per_container_max',
      kind: 'number',
      unlimitedLabel: 'Unlimited items per collection',
      limitedLabelTemplate: 'Up to {count} items per collection',
    },
  ],
  usageMeterCopy: {
    ai_summarize: {
      label: 'AI summarize',
      description: 'Summaries generated in this app count toward this meter.',
    },
  },
  usageLimitsCopy: {
    collectionsRowName: 'Collections',
    itemsRowName: 'Items per collection (max in one collection)',
    collectionsFootnote:
      'Collection counts use the template demo; wire your product for real item counts.',
  },
});

export type BillingConfig = typeof billingConfig;

export const METER_AI_SUMMARIZE = 'ai_summarize' as const;

export type AdopterFeatureKey = InferFeatureKeys<typeof billingConfig>;

/** @deprecated Use billingConfig — remove in the next template major (2027.x). */
export const beakerstackBillingConfig = billingConfig;

/** @deprecated Use METER_AI_SUMMARIZE — remove in the next template major (2027.x). */
export const BEAKERSTACK_METER_AI_SUMMARIZE = METER_AI_SUMMARIZE;

/** @deprecated Use AdopterFeatureKey — remove in the next template major (2027.x). */
export type BeakerstackFeatureKey = AdopterFeatureKey;

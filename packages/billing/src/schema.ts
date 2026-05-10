import { z } from 'zod';

/** One row in the plan card “What’s included” list (product-level, shared by all tiers). */
export const planFeatureRowSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    featureKey: z.string().min(1),
    kind: z.literal('boolean'),
    /** Line text (check vs X reflects plan value). */
    label: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    featureKey: z.string().min(1),
    kind: z.literal('number'),
    unlimitedLabel: z.string().min(1),
    /** Use `{count}` for the numeric cap (non-negative). */
    limitedLabelTemplate: z.string().min(1),
  }),
]);

export type PlanFeatureRowConfig = z.infer<typeof planFeatureRowSchema>;

/** Optional templates for downgrade constraint messages (`{placeholder}` replaced at runtime). */
export const downgradeConstraintCopySchema = z.object({
  collectionsOverCap: z.string().optional(),
  /** `{featureLabel}`, `{exclusivePlanName}`, `{targetPlanName}` */
  booleanFeatureLoss: z.string().optional(),
  meterOverCap: z.string().optional(),
  /** `{maxItems}`, `{cap}`, `{targetPlan}` — max items in any single collection vs target tier cap */
  itemsPerCollectionOverCap: z.string().optional(),
});

export type DowngradeConstraintCopy = z.infer<
  typeof downgradeConstraintCopySchema
>;

/** Single plan row as embedded in app config (mirrors public.billing_plans semantics, minus DB-only columns). */
export const billingPlanConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
  description: z.string().optional(),
  /** Short line under the plan title on pricing cards (falls back to `description` then app defaults). */
  planCardTagline: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  billingPeriod: z.enum(['free', 'monthly', 'yearly', 'one_time']),
  /** @deprecated Use stripePriceIdMonthly / stripePriceIdAnnual; kept for older configs. */
  stripePriceId: z.string().nullable().optional(),
  stripePriceIdMonthly: z.string().nullable().optional(),
  stripePriceIdAnnual: z.string().nullable().optional(),
  stripeProductId: z.string().nullable().optional(),
  features: z.record(z.union([z.boolean(), z.number()])),
  usageLimits: z.record(z.number()),
  trialPeriodDays: z.number().int().nonnegative().optional(),
  isPublic: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const productBillingConfigSchema = z.object({
  productId: z.string().min(1),
  displayName: z.string(),
  description: z.string().optional(),
  plans: z.array(billingPlanConfigSchema).min(1),
  /** Plan card feature bullets; omit to use app-level defaults. */
  planFeatureRows: z.array(planFeatureRowSchema).optional(),
  /** Downgrade blocker copy; omit to use app-level defaults. */
  downgradeConstraintCopy: downgradeConstraintCopySchema.optional(),
  /** Usage page meter labels keyed by meter id (e.g. `ai_summarize`). */
  usageMeterCopy: z
    .record(
      z.object({
        label: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  /** Usage page “Limits” row titles / footnote. */
  usageLimitsCopy: z
    .object({
      collectionsRowName: z.string().optional(),
      itemsRowName: z.string().optional(),
      collectionsFootnote: z.string().optional(),
    })
    .optional(),
});

export type BillingPlanConfig = z.infer<typeof billingPlanConfigSchema>;
export type ProductBillingConfig = z.infer<typeof productBillingConfigSchema>;

export type BillingConfig = ProductBillingConfig;

export function defineBillingConfig<const C extends ProductBillingConfig>(
  config: C
): C {
  return productBillingConfigSchema.parse(config) as C;
}

/** Union of feature keys declared across all plans in config. */
export type InferFeatureKeys<P extends ProductBillingConfig> =
  keyof P['plans'][number]['features'];

/** Union of meter keys in usage_limits across plans. */
export type InferMeterKeys<P extends ProductBillingConfig> =
  keyof P['plans'][number]['usageLimits'];

import type { ProductBillingConfig } from '../schema.js';
import type { Plan } from '../types.js';
import {
  applyTemplate,
  booleanFeatureLabel,
  exclusiveBooleanFeaturePlanName,
  mergeDowngradeConstraintCopy,
  mergePlanFeatureRows,
} from './planPresentation.js';

export type DowngradeBlockersResult = {
  /** Collections over cap, items-per-collection over cap, meter over cap — block the CTA. */
  hard: string[];
  /** Boolean entitlement loss — show warning; CTA remains enabled (see billing UI spec §3.3 soft vs hard). */
  soft: string[];
};

function booleanFeatureEnabled(plan: Plan, key: string): boolean {
  const v = plan.features[key];
  return v === true || v === 1;
}

/**
 * Downgrade constraints: **hard** (numeric/meter) vs **soft** (boolean features you would lose).
 * Spec §3.3 originally made all constraints hard for v1; we treat boolean entitlement loss as soft so
 * users can acknowledge downgrade when nothing must be deleted (only capability loss).
 */
export function computeDowngradeBlockers(
  currentPlan: Plan,
  targetPlan: Plan,
  options: {
    collectionCount: number;
    maxItemsInAnyCollection: number;
    aiUsedThisPeriod: number;
  },
  allPlans: Plan[],
  billingConfig: ProductBillingConfig
): DowngradeBlockersResult {
  const copy = mergeDowngradeConstraintCopy(billingConfig);
  const hard: string[] = [];
  const soft: string[] = [];
  const targetPlanName = targetPlan.display_name ?? targetPlan.id;

  const tCap = targetPlan.features['containers_per_account_max'] as
    | number
    | undefined;
  if (tCap != null && tCap >= 0 && options.collectionCount > tCap) {
    hard.push(
      applyTemplate(copy.collectionsOverCap, {
        current: options.collectionCount,
        cap: tCap,
        targetPlan: targetPlanName,
        deleteCount: options.collectionCount - tCap,
      })
    );
  }

  const itemsCap = targetPlan.features['items_per_container_max'] as
    | number
    | undefined;
  if (
    itemsCap != null &&
    itemsCap >= 0 &&
    options.maxItemsInAnyCollection > itemsCap
  ) {
    hard.push(
      applyTemplate(copy.itemsPerCollectionOverCap, {
        maxItems: options.maxItemsInAnyCollection,
        cap: itemsCap,
        targetPlan: targetPlanName,
      })
    );
  }

  const lim = targetPlan.usage_limits['ai_summarize'] as number | undefined;
  if (lim != null && lim >= 0 && options.aiUsedThisPeriod > lim) {
    hard.push(
      applyTemplate(copy.meterOverCap, {
        used: options.aiUsedThisPeriod,
        limit: lim,
        targetPlan: targetPlanName,
      })
    );
  }

  for (const row of mergePlanFeatureRows(billingConfig)) {
    if (row.kind !== 'boolean') continue;
    if (
      booleanFeatureEnabled(currentPlan, row.featureKey) &&
      !booleanFeatureEnabled(targetPlan, row.featureKey)
    ) {
      const featureLabel = booleanFeatureLabel(billingConfig, row.featureKey);
      const exclusivePlanName =
        exclusiveBooleanFeaturePlanName(allPlans, row.featureKey) ??
        'a higher tier';
      soft.push(
        applyTemplate(copy.booleanFeatureLoss, {
          featureLabel,
          exclusivePlanName,
          targetPlanName,
        })
      );
    }
  }

  return { hard, soft };
}

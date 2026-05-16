import type {
  DowngradeConstraintCopy,
  PlanFeatureRowConfig,
  ProductBillingConfig,
} from '../schema.js';
import type { Plan } from '../types.js';

/** Default “What’s included” rows when `planFeatureRows` is omitted in config. */
export const DEFAULT_PLAN_FEATURE_ROWS: PlanFeatureRowConfig[] = [
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
];

const DEFAULT_DOWNGRADE: Required<DowngradeConstraintCopy> = {
  collectionsOverCap:
    'You currently have {current} collections. The {targetPlan} plan allows {cap}. Delete {deleteCount} collection(s) before downgrading.',
  booleanFeatureLoss:
    'Your current plan includes {featureLabel} (available on {exclusivePlanName}). The {targetPlanName} plan does not — it will be disabled after you downgrade.',
  meterOverCap:
    "You've used {used} AI summaries this month. The {targetPlan} plan allows {limit} per month.",
  itemsPerCollectionOverCap:
    'One of your collections has {maxItems} items. The {targetPlan} plan allows up to {cap} items per collection. Remove items or reorganize collections before downgrading.',
};

export function mergePlanFeatureRows(
  config: ProductBillingConfig
): PlanFeatureRowConfig[] {
  const rows = config.planFeatureRows;
  return rows && rows.length > 0 ? rows : DEFAULT_PLAN_FEATURE_ROWS;
}

export function mergeDowngradeConstraintCopy(
  config: ProductBillingConfig
): Required<DowngradeConstraintCopy> {
  const d = config.downgradeConstraintCopy ?? {};
  return {
    collectionsOverCap:
      d.collectionsOverCap ?? DEFAULT_DOWNGRADE.collectionsOverCap,
    booleanFeatureLoss:
      d.booleanFeatureLoss ?? DEFAULT_DOWNGRADE.booleanFeatureLoss,
    meterOverCap: d.meterOverCap ?? DEFAULT_DOWNGRADE.meterOverCap,
    itemsPerCollectionOverCap:
      d.itemsPerCollectionOverCap ??
      DEFAULT_DOWNGRADE.itemsPerCollectionOverCap,
  };
}

export function applyTemplate(
  template: string | undefined,
  vars: Record<string, string | number>
): string {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  );
}

export function planFeatureLine(
  plan: Plan,
  row: PlanFeatureRowConfig
): { ok: boolean; text: string } {
  const raw = plan.features[row.featureKey];
  if (row.kind === 'boolean') {
    return { ok: !!raw, text: row.label };
  }
  const n = typeof raw === 'number' ? raw : 0;
  if (n === -1) return { ok: true, text: row.unlimitedLabel };
  return {
    ok: n > 0,
    text: row.limitedLabelTemplate.replace(/\{count\}/g, String(n)),
  };
}

/** Label for a boolean feature row (e.g. downgrade copy). */
export function booleanFeatureLabel(
  config: ProductBillingConfig,
  featureKey: string
): string {
  const row = mergePlanFeatureRows(config).find(
    (r): r is Extract<PlanFeatureRowConfig, { kind: 'boolean' }> =>
      r.kind === 'boolean' && r.featureKey === featureKey
  );
  return row?.label ?? featureKey;
}

/** Plan with highest `display_order` among plans where `features[featureKey]` is truthy. */
export function exclusiveBooleanFeaturePlanName(
  allPlans: Plan[],
  featureKey: string
): string | null {
  const holders = allPlans.filter(p => {
    const v = p.features[featureKey];
    return v === true || v === 1;
  });
  if (holders.length === 0) return null;
  holders.sort((a, b) => (b.display_order ?? 0) - (a.display_order ?? 0));
  return holders[0]?.display_name ?? null;
}

const DEFAULT_USAGE_METER_COPY: Record<
  string,
  { label: string; description?: string }
> = {
  ai_summarize: {
    label: 'AI summarize',
    description: 'Summaries generated in this app count toward this meter.',
  },
};

const DEFAULT_USAGE_LIMITS_COPY = {
  collectionsRowName: 'Collections',
  itemsRowName: 'Items per collection (max in one collection)',
  collectionsFootnote:
    'Collection counts use the template demo; wire your product for real item counts.',
};

export function mergeUsageMeterCopy(
  config: ProductBillingConfig
): Record<string, { label: string; description?: string }> {
  const out: Record<string, { label: string; description?: string }> = {
    ...DEFAULT_USAGE_METER_COPY,
  };
  for (const [k, v] of Object.entries(config.usageMeterCopy ?? {})) {
    const prev = out[k];
    const label = v.label ?? prev?.label ?? k;
    const description = v.description ?? prev?.description;
    out[k] = description !== undefined ? { label, description } : { label };
  }
  return out;
}

export function mergeUsageLimitsCopy(
  config: ProductBillingConfig
): typeof DEFAULT_USAGE_LIMITS_COPY {
  const d = config.usageLimitsCopy ?? {};
  return {
    collectionsRowName:
      d.collectionsRowName ?? DEFAULT_USAGE_LIMITS_COPY.collectionsRowName,
    itemsRowName: d.itemsRowName ?? DEFAULT_USAGE_LIMITS_COPY.itemsRowName,
    collectionsFootnote:
      d.collectionsFootnote ?? DEFAULT_USAGE_LIMITS_COPY.collectionsFootnote,
  };
}

/** Numeric entitlement from plan.features (-1 = unlimited sentinel). */
export function numericPlanFeature(
  features: Record<string, unknown>,
  key: string,
  fallback = -1
): number {
  const v = features[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

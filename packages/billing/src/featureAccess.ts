/**
 * Pure helpers for plan feature gates (shared by `useFeature` and `billingClient`).
 * Numeric feature values represent caps/limits; **enforcement** of those caps uses
 * usage RPCs (`hasExceededLimit` / `getRemainingUsage`), not this boolean alone.
 */
export function readPlanFeatureValue(
  features: Record<string, boolean | number> | null | undefined,
  featureName: string
): boolean | number | null {
  if (!features) return null;
  const raw = features[featureName];
  if (typeof raw === 'boolean' || typeof raw === 'number') return raw;
  return null;
}

/** Boolean gate: numeric features return `true` here (limit checked separately). */
export function isFeatureAccessible(
  features: Record<string, boolean | number> | null | undefined,
  featureName: string
): boolean {
  const raw = readPlanFeatureValue(features, featureName);
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return true;
  return false;
}

import { billingConfig } from '@adopter/config/billing';

/** Meter keys from billing config shown as usage columns on the admin Users table. */
export function getAdminUsageMeterKeys(): string[] {
  const keys = new Set<string>();
  for (const plan of billingConfig.plans) {
    for (const key of Object.keys(plan.usageLimits)) {
      keys.add(key);
    }
  }
  return [...keys].sort();
}

export const adminProductId = billingConfig.productId;

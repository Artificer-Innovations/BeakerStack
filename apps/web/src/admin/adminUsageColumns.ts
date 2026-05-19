import { beakerstackBillingConfig } from '../billing/beakerstackBillingConfig';

/** Meter keys from billing config shown as usage columns on the admin Users table. */
export function getAdminUsageMeterKeys(): string[] {
  const keys = new Set<string>();
  for (const plan of beakerstackBillingConfig.plans) {
    for (const key of Object.keys(plan.usageLimits)) {
      keys.add(key);
    }
  }
  return [...keys].sort();
}

export const adminProductId = beakerstackBillingConfig.productId;

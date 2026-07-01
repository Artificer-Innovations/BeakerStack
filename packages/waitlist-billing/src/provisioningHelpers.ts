import {
  parseStoredProvisioningIntent,
  toRpcProvisioningIntent,
  type WaitlistCompIntentInput,
  type WaitlistProvisioningIntentInput,
} from '@beakerstack/waitlist';

export { parseStoredProvisioningIntent, toRpcProvisioningIntent };

export function buildCompProvisioningIntent(
  planId: string,
  reason: string
): WaitlistCompIntentInput {
  return {
    kind: 'billing_comp',
    planId,
    reason: reason.trim(),
  };
}

export type { WaitlistProvisioningIntentInput };

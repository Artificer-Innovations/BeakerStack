import { describe, expect, it } from 'vitest';
import {
  buildCompProvisioningIntent,
  parseStoredProvisioningIntent,
} from '../provisioningHelpers.js';

describe('waitlist-billing provisioning helpers', () => {
  it('builds comp intent input', () => {
    expect(
      buildCompProvisioningIntent('beakerstack_vip', '  Partner  ')
    ).toEqual({
      kind: 'billing_comp',
      planId: 'beakerstack_vip',
      reason: 'Partner',
    });
  });

  it('re-exports parseStoredProvisioningIntent', () => {
    expect(
      parseStoredProvisioningIntent({
        provisioning_intent: {
          kind: 'billing_plan',
          planId: 'skein_free',
        },
      })
    ).toEqual({ kind: 'billing_plan', planId: 'skein_free' });
  });
});

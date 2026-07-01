import { describe, expect, it } from 'vitest';
import {
  isWaitlistCompIntentInput,
  parseStoredProvisioningIntent,
  toRpcProvisioningIntent,
} from './provisioning.js';

describe('provisioning', () => {
  it('parses stored billing_comp intent', () => {
    expect(
      parseStoredProvisioningIntent({
        provisioning_intent: {
          kind: 'billing_comp',
          planId: 'beakerstack_vip',
          reason: 'Design partner',
          grantedBy: 'admin-uuid',
        },
      })
    ).toEqual({
      kind: 'billing_comp',
      planId: 'beakerstack_vip',
      reason: 'Design partner',
      grantedBy: 'admin-uuid',
    });
  });

  it('serializes admin comp input without grantedBy', () => {
    expect(
      toRpcProvisioningIntent({
        kind: 'billing_comp',
        planId: 'beakerstack_vip',
        reason: '  Founder friend  ',
      })
    ).toEqual({
      kind: 'billing_comp',
      planId: 'beakerstack_vip',
      reason: 'Founder friend',
    });
  });

  it('returns null RPC payload when clearing intent', () => {
    expect(toRpcProvisioningIntent(null)).toBeNull();
  });

  it('serializes billing_plan intent', () => {
    expect(
      toRpcProvisioningIntent({
        kind: 'billing_plan',
        planId: 'beakerstack_free',
      })
    ).toEqual({ kind: 'billing_plan', planId: 'beakerstack_free' });
  });

  it('returns null for invalid stored metadata', () => {
    expect(parseStoredProvisioningIntent(null)).toBeNull();
    expect(parseStoredProvisioningIntent({})).toBeNull();
    expect(
      parseStoredProvisioningIntent({ provisioning_intent: { kind: 'bad' } })
    ).toBeNull();
    expect(
      parseStoredProvisioningIntent({
        provisioning_intent: { kind: 'billing_comp', planId: 'x', reason: '' },
      })
    ).toBeNull();
  });

  it('parses billing_plan and nullable grantedBy', () => {
    expect(
      parseStoredProvisioningIntent({
        provisioning_intent: {
          kind: 'billing_plan',
          planId: 'beakerstack_free',
        },
      })
    ).toEqual({ kind: 'billing_plan', planId: 'beakerstack_free' });
    expect(
      parseStoredProvisioningIntent({
        provisioning_intent: {
          kind: 'billing_comp',
          planId: 'beakerstack_vip',
          reason: 'x',
          grantedBy: '',
        },
      })?.kind
    ).toBe('billing_comp');
  });

  it('identifies comp intent input', () => {
    expect(
      isWaitlistCompIntentInput({
        kind: 'billing_comp',
        planId: 'beakerstack_vip',
        reason: 'x',
      })
    ).toBe(true);
    expect(
      isWaitlistCompIntentInput({
        kind: 'billing_plan',
        planId: 'beakerstack_free',
      })
    ).toBe(false);
  });
});

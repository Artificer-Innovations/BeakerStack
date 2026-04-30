import { describe, expect, it } from 'vitest';
import { subscriptionStatusLabel } from './subscriptionStatusLabel.js';
import { testSubscription } from '../test/billingFixtures.js';

describe('subscriptionStatusLabel', () => {
  it('returns em dash without subscription', () => {
    expect(subscriptionStatusLabel(null, 'Jan 1')).toBe('—');
    expect(subscriptionStatusLabel(undefined, 'Jan 1')).toBe('—');
  });

  it('returns em dash when status missing', () => {
    expect(
      subscriptionStatusLabel(
        testSubscription({ status: '' as unknown as string }),
        'Jan 1'
      )
    ).toBe('—');
  });

  it('shows cancelled copy when cancel_at_period_end and active', () => {
    const s = testSubscription({
      status: 'active',
      cancel_at_period_end: true,
    });
    expect(subscriptionStatusLabel(s, 'Feb 2')).toBe(
      'Cancelled - Subscription ends on Feb 2'
    );
  });

  it('shows cancelled copy for trialing with cancel at period end', () => {
    const s = testSubscription({
      status: 'trialing',
      cancel_at_period_end: true,
    });
    expect(subscriptionStatusLabel(s, 'Mar 3')).toContain('Cancelled');
  });

  it('shows active copy for active without cancel', () => {
    const s = testSubscription({
      status: 'active',
      cancel_at_period_end: false,
    });
    expect(subscriptionStatusLabel(s, 'Apr 4')).toBe(
      'Active - Renews on Apr 4'
    );
  });

  it('shows active copy for trialing', () => {
    const s = testSubscription({ status: 'trialing' });
    expect(subscriptionStatusLabel(s, 'May 5')).toContain('Active');
  });

  it('returns Free for free status', () => {
    expect(
      subscriptionStatusLabel(testSubscription({ status: 'free' }), 'x')
    ).toBe('Free');
  });

  it('returns raw status for other values', () => {
    expect(
      subscriptionStatusLabel(testSubscription({ status: 'paused' }), 'x')
    ).toBe('paused');
  });
});

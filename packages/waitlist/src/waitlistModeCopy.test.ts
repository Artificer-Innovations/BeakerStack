import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WAITLIST_MODE_COPY,
  formatWaitlistPricingCta,
  resolveWaitlistModeCopy,
} from './waitlistModeCopy.js';

describe('waitlistModeCopy', () => {
  it('resolveWaitlistModeCopy uses defaults when unset', () => {
    expect(resolveWaitlistModeCopy(undefined, undefined)).toEqual(
      DEFAULT_WAITLIST_MODE_COPY
    );
  });

  it('resolveWaitlistModeCopy prefers settings over config', () => {
    expect(
      resolveWaitlistModeCopy(
        { waitlist: { tier_panel_header: 'Reserve your spot for' } },
        { waitlist: { tier_panel_header: 'Config header' } }
      ).tier_panel_header
    ).toBe('Reserve your spot for');
  });

  it('formatWaitlistPricingCta replaces tier placeholder', () => {
    expect(
      formatWaitlistPricingCta('Join the waitlist for {tier}', 'Pro')
    ).toBe('Join the waitlist for Pro');
    expect(formatWaitlistPricingCta('Waitlist — {TIER}', 'Team')).toBe(
      'Waitlist — Team'
    );
  });
});

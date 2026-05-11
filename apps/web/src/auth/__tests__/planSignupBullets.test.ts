import { describe, expect, it } from 'vitest';
import { planSignupBullets } from '../planSignupBullets';

describe('planSignupBullets', () => {
  it('returns non-empty strings for known plans', () => {
    const b = planSignupBullets('beakerstack_pro');
    expect(b.length).toBeGreaterThan(0);
    expect(b.length).toBeLessThanOrEqual(3);
    expect(b.every(x => typeof x === 'string' && x.length > 0)).toBe(true);
  });

  it('includes trial copy when trial days > 0', () => {
    const b = planSignupBullets('beakerstack_max');
    expect(b.some(x => /trial/i.test(x))).toBe(true);
  });

  it('returns empty for unknown plan', () => {
    expect(planSignupBullets('unknown')).toEqual([]);
  });

  it('lists limited numeric features for Free plan', () => {
    const b = planSignupBullets('beakerstack_free');
    expect(b.some(x => /Up to 2 collections/i.test(x))).toBe(true);
    expect(b.some(x => /Up to 3 items per collection/i.test(x))).toBe(true);
    expect(b.some(x => /AI summarize/i.test(x))).toBe(true);
    expect(b.length).toBeLessThanOrEqual(3);
  });

  it('includes unlimited collection copy when capped at -1', () => {
    const b = planSignupBullets('beakerstack_pro');
    expect(b.some(x => /Unlimited collections/i.test(x))).toBe(true);
    expect(b.some(x => /Feature A/i.test(x))).toBe(true);
  });

  it('caps at three lines on Max (trial + booleans fill quota before meter)', () => {
    const b = planSignupBullets('beakerstack_max');
    expect(b.length).toBe(3);
    expect(b.some(x => /trial/i.test(x))).toBe(true);
    expect(b.some(x => /Feature A/i.test(x))).toBe(true);
    expect(b.some(x => /Feature B/i.test(x))).toBe(true);
  });

  it('adds meter copy when feature rows leave room (Free)', () => {
    const b = planSignupBullets('beakerstack_free');
    expect(
      b.some(x => /\d+\s+AI summarize\s+\/\s+billing period/i.test(x))
    ).toBe(true);
  });
});

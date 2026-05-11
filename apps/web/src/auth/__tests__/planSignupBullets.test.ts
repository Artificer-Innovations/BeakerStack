import { describe, expect, it } from 'vitest';
import { planSignupBullets } from '../planSignupBullets';

describe('planSignupBullets', () => {
  it('returns bullets for Pro', () => {
    const b = planSignupBullets('beakerstack_pro');
    expect(b.length).toBeGreaterThan(0);
    expect(b.some(x => /Feature A/i.test(x))).toBe(true);
  });

  it('includes trial copy for Max', () => {
    const b = planSignupBullets('beakerstack_max');
    expect(b.some(x => /trial/i.test(x))).toBe(true);
  });

  it('returns empty for unknown plan', () => {
    expect(planSignupBullets('unknown')).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { isFeatureAccessible, readPlanFeatureValue } from './featureAccess.js';

describe('featureAccess', () => {
  it('readPlanFeatureValue returns boolean and number', () => {
    expect(readPlanFeatureValue({ a: true }, 'a')).toBe(true);
    expect(readPlanFeatureValue({ n: 3 }, 'n')).toBe(3);
    expect(readPlanFeatureValue({}, 'x')).toBe(null);
  });

  it('isFeatureAccessible treats numbers as accessible for boolean gate', () => {
    expect(isFeatureAccessible({ cap: 5 }, 'cap')).toBe(true);
    expect(isFeatureAccessible({ cap: 0 }, 'cap')).toBe(true);
    expect(isFeatureAccessible({ x: false }, 'x')).toBe(false);
  });

  it('readPlanFeatureValue returns null for missing features map', () => {
    expect(readPlanFeatureValue(null, 'a')).toBe(null);
    expect(readPlanFeatureValue(undefined, 'a')).toBe(null);
  });

  it('isFeatureAccessible returns false for non-boolean non-number stored values', () => {
    expect(
      isFeatureAccessible(
        { weird: 'yes' } as unknown as Record<string, boolean | number>,
        'weird'
      )
    ).toBe(false);
  });
});

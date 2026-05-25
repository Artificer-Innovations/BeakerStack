import { numericPlanFeature } from '../planFeatureValue';

describe('numericPlanFeature', () => {
  it('returns the feature value when it is a finite number', () => {
    expect(
      numericPlanFeature(
        { containers_per_account_max: 5 },
        'containers_per_account_max'
      )
    ).toBe(5);
  });

  it('returns -1 for unlimited sentinel values', () => {
    expect(
      numericPlanFeature(
        { items_per_container_max: -1 },
        'items_per_container_max'
      )
    ).toBe(-1);
  });

  it('falls back when the key is missing', () => {
    expect(numericPlanFeature({}, 'missing_key')).toBe(-1);
  });

  it('falls back for custom default when value is not numeric', () => {
    expect(numericPlanFeature({ cap: 'lots' }, 'cap', 0)).toBe(0);
  });

  it('falls back when value is not a finite number', () => {
    expect(numericPlanFeature({ cap: NaN }, 'cap', 3)).toBe(3);
    expect(numericPlanFeature({ cap: Infinity }, 'cap', 3)).toBe(3);
    expect(numericPlanFeature({ cap: null }, 'cap', 3)).toBe(3);
    expect(numericPlanFeature({ cap: true }, 'cap', 3)).toBe(3);
  });
});

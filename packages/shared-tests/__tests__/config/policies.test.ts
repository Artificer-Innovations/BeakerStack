import { describe, it, expect } from '@jest/globals';
import { POLICIES } from '@beakerstack/shared/generated/policies';

describe('POLICIES', () => {
  it('exports terms, privacy, and refunds keys', () => {
    expect(POLICIES).toHaveProperty('terms');
    expect(POLICIES).toHaveProperty('privacy');
    expect(POLICIES).toHaveProperty('refunds');
  });

  it('all policy values are non-empty strings', () => {
    for (const key of ['terms', 'privacy', 'refunds'] as const) {
      expect(typeof POLICIES[key]).toBe('string');
      expect(POLICIES[key].length).toBeGreaterThan(0);
    }
  });

  it('all policy values contain HTML content', () => {
    for (const key of ['terms', 'privacy', 'refunds'] as const) {
      expect(POLICIES[key]).toMatch(/<h1>/);
    }
  });
});

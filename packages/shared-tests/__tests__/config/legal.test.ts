import { describe, it, expect } from '@jest/globals';
import { LEGAL_CONFIG } from '@beakerstack/shared/config/legal';

describe('LEGAL_CONFIG', () => {
  it('has a non-empty brandName', () => {
    expect(typeof LEGAL_CONFIG.brandName).toBe('string');
    expect(LEGAL_CONFIG.brandName.length).toBeGreaterThan(0);
  });

  it('has a non-empty brandUrl', () => {
    expect(typeof LEGAL_CONFIG.brandUrl).toBe('string');
    expect(LEGAL_CONFIG.brandUrl.length).toBeGreaterThan(0);
  });

  it('has a non-empty legalEntityName', () => {
    expect(typeof LEGAL_CONFIG.legalEntityName).toBe('string');
    expect(LEGAL_CONFIG.legalEntityName.length).toBeGreaterThan(0);
  });

  it('has a valid contactEmail containing @', () => {
    expect(LEGAL_CONFIG.contactEmail).toContain('@');
    expect(LEGAL_CONFIG.contactEmail.length).toBeGreaterThan(0);
  });
});

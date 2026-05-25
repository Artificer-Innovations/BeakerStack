import { describe, it, expect } from '@jest/globals';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';

describe('adopter legal config', () => {
  it('has a non-empty brandName', () => {
    expect(typeof getAdopterConfig().legal.brandName).toBe('string');
    expect(getAdopterConfig().legal.brandName.length).toBeGreaterThan(0);
  });

  it('has a non-empty brandUrl', () => {
    expect(typeof getAdopterConfig().legal.brandUrl).toBe('string');
    expect(getAdopterConfig().legal.brandUrl.length).toBeGreaterThan(0);
  });

  it('has a non-empty legalEntityName', () => {
    expect(typeof getAdopterConfig().legal.legalEntityName).toBe('string');
    expect(getAdopterConfig().legal.legalEntityName.length).toBeGreaterThan(0);
  });

  it('has a valid contactEmail containing @', () => {
    expect(getAdopterConfig().legal.contactEmail).toContain('@');
    expect(getAdopterConfig().legal.contactEmail.length).toBeGreaterThan(0);
  });

  it('has a non-empty mailingAddress (CAN-SPAM physical address)', () => {
    expect(typeof getAdopterConfig().legal.mailingAddress).toBe('string');
    expect(getAdopterConfig().legal.mailingAddress.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { branding } from '@adopter/config/branding';
import { landingConfig } from '@adopter/config/landing';

describe('landingConfig branding', () => {
  it('uses displayName for brand nav', () => {
    expect(landingConfig.brand.name).toBe(branding.displayName);
  });
});

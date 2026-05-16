import { describe, it, expect } from 'vitest';
import { BRANDING } from '@beakerstack/shared/config/branding';
import { landingConfig } from '../landing';

describe('landingConfig branding', () => {
  it('uses displayName for brand nav', () => {
    expect(landingConfig.brand.name).toBe(BRANDING.displayName);
  });
});

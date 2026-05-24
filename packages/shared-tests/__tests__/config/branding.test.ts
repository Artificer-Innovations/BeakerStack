import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import {
  brandNameRegex,
  branding as staticBranding,
} from '@adopter/config/branding';

describe('branding', () => {
  describe('getAdopterConfig().branding', () => {
    it('should have all required branding properties', () => {
      expect(getAdopterConfig().branding).toHaveProperty('displayName');
      expect(getAdopterConfig().branding).toHaveProperty('shortName');
      expect(getAdopterConfig().branding).toHaveProperty('slug');
      expect(getAdopterConfig().branding).toHaveProperty('camelName');
      expect(getAdopterConfig().branding).toHaveProperty('pascalName');
      expect(getAdopterConfig().branding).toHaveProperty('snakeName');
      expect(getAdopterConfig().branding).toHaveProperty('upperSnakeName');
      expect(getAdopterConfig().branding).toHaveProperty('flatName');
    });

    it('should have string values for all properties', () => {
      Object.values(getAdopterConfig().branding).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent naming conventions', () => {
      const { branding } = getAdopterConfig();
      expect(branding.displayName).toBe(branding.shortName);
      expect(branding.slug).toMatch(/^[a-z0-9-]+$/);
      expect(branding.camelName).toMatch(/^[a-z]/);
      expect(branding.pascalName).toMatch(/^[A-Z]/);
      expect(branding.snakeName).toMatch(/^[a-z0-9_]+$/);
      expect(branding.upperSnakeName).toMatch(/^[A-Z0-9_]+$/);
      expect(branding.flatName).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('brandNameRegex', () => {
    it('should create a regex matching the static display name', () => {
      const regex = brandNameRegex();
      expect(staticBranding.displayName).toMatch(regex);
    });

    it('should be case-insensitive by default', () => {
      const regex = brandNameRegex();
      expect(staticBranding.displayName.toLowerCase()).toMatch(regex);
      expect(staticBranding.displayName.toUpperCase()).toMatch(regex);
    });

    it('should accept custom flags', () => {
      const regex = brandNameRegex('g');
      expect(regex.flags).toContain('g');
    });

    it('should match the display name in text', () => {
      const regex = brandNameRegex();
      const text = `Welcome to ${staticBranding.displayName}!`;
      expect(text).toMatch(regex);
    });

    it('should match case-insensitively', () => {
      const regex = brandNameRegex('i');
      const lowerText = staticBranding.displayName.toLowerCase();
      expect(lowerText).toMatch(regex);
    });
  });

  describe('type safety', () => {
    it('should export Branding type', () => {
      const { branding } = getAdopterConfig();
      expect(branding.displayName).toBeTruthy();
    });
  });
});

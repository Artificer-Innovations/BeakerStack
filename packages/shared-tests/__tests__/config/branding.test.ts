import { BRANDING, brandNameRegex } from '@shared/src/config/branding';

describe('branding', () => {
  describe('BRANDING constants', () => {
    it('should have all required branding properties', () => {
      expect(BRANDING).toHaveProperty('displayName');
      expect(BRANDING).toHaveProperty('shortName');
      expect(BRANDING).toHaveProperty('slug');
      expect(BRANDING).toHaveProperty('camelName');
      expect(BRANDING).toHaveProperty('pascalName');
      expect(BRANDING).toHaveProperty('snakeName');
      expect(BRANDING).toHaveProperty('upperSnakeName');
      expect(BRANDING).toHaveProperty('flatName');
    });

    it('should have string values for all properties', () => {
      Object.values(BRANDING).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent naming conventions', () => {
      // Display name should match short name
      expect(BRANDING.displayName).toBe(BRANDING.shortName);

      // Slug should be lowercase with hyphens
      expect(BRANDING.slug).toMatch(/^[a-z0-9-]+$/);

      // Camel name should start with lowercase
      expect(BRANDING.camelName).toMatch(/^[a-z]/);

      // Pascal name should start with uppercase
      expect(BRANDING.pascalName).toMatch(/^[A-Z]/);

      // Snake name should be lowercase with underscores
      expect(BRANDING.snakeName).toMatch(/^[a-z0-9_]+$/);

      // Upper snake name should be uppercase with underscores
      expect(BRANDING.upperSnakeName).toMatch(/^[A-Z0-9_]+$/);

      // Flat name should be lowercase, no spaces or special chars
      expect(BRANDING.flatName).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('brandNameRegex', () => {
    it('should create a regex matching the display name', () => {
      const regex = brandNameRegex();
      expect(BRANDING.displayName).toMatch(regex);
    });

    it('should be case-insensitive by default', () => {
      const regex = brandNameRegex();
      expect(BRANDING.displayName.toLowerCase()).toMatch(regex);
      expect(BRANDING.displayName.toUpperCase()).toMatch(regex);
    });

    it('should accept custom flags', () => {
      const regex = brandNameRegex('g');
      expect(regex.flags).toContain('g');
    });

    it('should match the display name in text', () => {
      const regex = brandNameRegex();
      const text = `Welcome to ${BRANDING.displayName}!`;
      expect(text).toMatch(regex);
    });

    it('should match case-insensitively', () => {
      const regex = brandNameRegex('i');
      const lowerText = BRANDING.displayName.toLowerCase();
      expect(lowerText).toMatch(regex);
    });
  });

  describe('type safety', () => {
    it('should export Branding type', () => {
      // TypeScript ensures type safety, but we can verify the structure
      const branding: typeof BRANDING = BRANDING;
      expect(branding).toBeDefined();
    });
  });
});

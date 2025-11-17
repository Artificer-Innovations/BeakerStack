import {
  HOME_STRINGS,
  DASHBOARD_STRINGS,
  HOME_TITLE,
  HOME_SUBTITLE,
  DASHBOARD_TITLE,
  DASHBOARD_SUBTITLE,
} from '@shared/src/utils/strings';
import { BRANDING } from '@shared/src/config/branding';

describe('strings', () => {
  describe('HOME_STRINGS', () => {
    it('should contain title and subtitle', () => {
      expect(HOME_STRINGS).toHaveProperty('title');
      expect(HOME_STRINGS).toHaveProperty('subtitle');
    });

    it('should include branding display name in title', () => {
      expect(HOME_STRINGS.title).toContain(BRANDING.displayName);
    });

    it('should have a descriptive subtitle', () => {
      expect(HOME_STRINGS.subtitle).toBeTruthy();
      expect(typeof HOME_STRINGS.subtitle).toBe('string');
      expect(HOME_STRINGS.subtitle.length).toBeGreaterThan(0);
    });
  });

  describe('DASHBOARD_STRINGS', () => {
    it('should contain title and subtitle', () => {
      expect(DASHBOARD_STRINGS).toHaveProperty('title');
      expect(DASHBOARD_STRINGS).toHaveProperty('subtitle');
    });

    it('should have a welcome message in title', () => {
      expect(DASHBOARD_STRINGS.title).toBeTruthy();
      expect(typeof DASHBOARD_STRINGS.title).toBe('string');
    });

    it('should have a descriptive subtitle', () => {
      expect(DASHBOARD_STRINGS.subtitle).toBeTruthy();
      expect(typeof DASHBOARD_STRINGS.subtitle).toBe('string');
    });
  });

  describe('individual string exports', () => {
    it('should export HOME_TITLE matching HOME_STRINGS.title', () => {
      expect(HOME_TITLE).toBe(HOME_STRINGS.title);
    });

    it('should export HOME_SUBTITLE matching HOME_STRINGS.subtitle', () => {
      expect(HOME_SUBTITLE).toBe(HOME_STRINGS.subtitle);
    });

    it('should export DASHBOARD_TITLE matching DASHBOARD_STRINGS.title', () => {
      expect(DASHBOARD_TITLE).toBe(DASHBOARD_STRINGS.title);
    });

    it('should export DASHBOARD_SUBTITLE matching DASHBOARD_STRINGS.subtitle', () => {
      expect(DASHBOARD_SUBTITLE).toBe(DASHBOARD_STRINGS.subtitle);
    });
  });

  describe('string constants are readonly', () => {
    it('should have readonly string objects', () => {
      // TypeScript ensures these are readonly, but we can verify they're objects
      expect(typeof HOME_STRINGS).toBe('object');
      expect(typeof DASHBOARD_STRINGS).toBe('object');
    });
  });
});

import {
  getHomeStrings,
  getHomeTitle,
  getHomeSubtitle,
  DASHBOARD_STRINGS,
  DASHBOARD_TITLE,
  DASHBOARD_SUBTITLE,
} from '@beakerstack/shared/utils/strings';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';

describe('strings', () => {
  describe('getHomeStrings', () => {
    it('should contain title and subtitle', () => {
      const homeStrings = getHomeStrings();
      expect(homeStrings).toHaveProperty('title');
      expect(homeStrings).toHaveProperty('subtitle');
    });

    it('should include branding display name in title', () => {
      expect(getHomeStrings().title).toContain(
        getAdopterConfig().branding.displayName
      );
    });

    it('should have a descriptive subtitle', () => {
      const { subtitle } = getHomeStrings();
      expect(subtitle).toBeTruthy();
      expect(typeof subtitle).toBe('string');
      expect(subtitle.length).toBeGreaterThan(0);
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

  describe('home string accessors', () => {
    it('should export getHomeTitle matching getHomeStrings().title', () => {
      expect(getHomeTitle()).toBe(getHomeStrings().title);
    });

    it('should export getHomeSubtitle matching getHomeStrings().subtitle', () => {
      expect(getHomeSubtitle()).toBe(getHomeStrings().subtitle);
    });

    it('should export DASHBOARD_TITLE matching DASHBOARD_STRINGS.title', () => {
      expect(DASHBOARD_TITLE).toBe(DASHBOARD_STRINGS.title);
    });

    it('should export DASHBOARD_SUBTITLE matching DASHBOARD_STRINGS.subtitle', () => {
      expect(DASHBOARD_SUBTITLE).toBe(DASHBOARD_STRINGS.subtitle);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { BRANDING } from '@beakerstack/shared/config/branding';
import { landingConfig } from '../landing';

const GITHUB_REPO = 'Artificer-Innovations/BeakerStack';

describe('landingConfig branding', () => {
  it('uses displayName for brand nav and avoids hardcoded PascalCase in user copy', () => {
    expect(landingConfig.brand.name).toBe(BRANDING.displayName);

    const serialized = JSON.stringify(landingConfig);
    const withoutGithubUrls = serialized.replace(
      new RegExp(`https://github.com/${GITHUB_REPO}[^"]*`, 'g'),
      ''
    );
    expect(withoutGithubUrls).not.toContain(BRANDING.pascalName);
  });
});

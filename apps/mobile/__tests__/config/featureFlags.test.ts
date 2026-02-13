import {
  featureFlags,
  useFeatureFlags,
  type FeatureFlags,
} from '../../src/config/featureFlags';

describe('featureFlags', () => {
  it('exports feature flags object', () => {
    expect(featureFlags).toBeDefined();
    expect(featureFlags.oauthGoogle).toBe(true);
    expect(featureFlags.showNativeHeader).toBe(false);
  });

  it('has correct type', () => {
    const flags: FeatureFlags = featureFlags;
    expect(flags).toBeDefined();
  });
});

describe('useFeatureFlags', () => {
  it('returns feature flags', () => {
    const flags = useFeatureFlags();
    expect(flags).toEqual(featureFlags);
  });

  it('returns same object reference', () => {
    const flags1 = useFeatureFlags();
    const flags2 = useFeatureFlags();
    expect(flags1).toBe(flags2);
  });
});

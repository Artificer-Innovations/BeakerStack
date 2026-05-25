describe('beakerstackObservabilityConfig', () => {
  const sentryEnvKeys = [
    'EXPO_PUBLIC_SENTRY_DSN',
    'EXPO_PUBLIC_SENTRY_RELEASE',
    'EXPO_PUBLIC_SENTRY_ENVIRONMENT',
  ] as const;

  beforeEach(() => {
    jest.resetModules();
    for (const key of sentryEnvKeys) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of sentryEnvKeys) {
      delete process.env[key];
    }
  });

  it('defaults to development in __DEV__ when Sentry env vars are unset', () => {
    const originalDev = __DEV__;
    // @ts-expect-error test-only assignment
    global.__DEV__ = true;

    const {
      beakerstackObservabilityConfig,
    } = require('../../src/config/observability');

    expect(beakerstackObservabilityConfig).toEqual({
      project: 'beakerstack-mobile',
      environment: 'development',
    });

    // @ts-expect-error test-only assignment
    global.__DEV__ = originalDev;
  });

  it('defaults to production outside __DEV__ when Sentry env vars are unset', () => {
    const originalDev = __DEV__;
    // @ts-expect-error test-only assignment
    global.__DEV__ = false;

    const {
      beakerstackObservabilityConfig,
    } = require('../../src/config/observability');

    expect(beakerstackObservabilityConfig.environment).toBe('production');
    expect(beakerstackObservabilityConfig).not.toHaveProperty('dsn');
    expect(beakerstackObservabilityConfig).not.toHaveProperty('release');

    // @ts-expect-error test-only assignment
    global.__DEV__ = originalDev;
  });

  it('includes trimmed Sentry env vars when set', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN =
      '  https://example.ingest.sentry.io/123  ';
    process.env.EXPO_PUBLIC_SENTRY_RELEASE = ' mobile@1.0.0 ';
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT = ' staging ';

    const {
      beakerstackObservabilityConfig,
    } = require('../../src/config/observability');

    expect(beakerstackObservabilityConfig).toEqual({
      project: 'beakerstack-mobile',
      environment: 'staging',
      dsn: 'https://example.ingest.sentry.io/123',
      release: 'mobile@1.0.0',
    });
  });

  it('ignores blank Sentry env vars', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = '   ';
    process.env.EXPO_PUBLIC_SENTRY_RELEASE = '';
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT = '\t';

    const originalDev = __DEV__;
    // @ts-expect-error test-only assignment
    global.__DEV__ = false;

    const {
      beakerstackObservabilityConfig,
    } = require('../../src/config/observability');

    expect(beakerstackObservabilityConfig).toEqual({
      project: 'beakerstack-mobile',
      environment: 'production',
    });

    // @ts-expect-error test-only assignment
    global.__DEV__ = originalDev;
  });
});

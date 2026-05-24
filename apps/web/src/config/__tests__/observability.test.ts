import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('beakerstackObservabilityConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to import.meta.env.MODE when Sentry env vars are unset', async () => {
    vi.stubEnv('MODE', 'test');
    vi.stubEnv('VITE_SENTRY_DSN', '');
    vi.stubEnv('VITE_SENTRY_RELEASE', '');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', '');

    const { beakerstackObservabilityConfig } = await import('../observability');

    expect(beakerstackObservabilityConfig).toEqual({
      project: 'beakerstack',
      environment: 'test',
    });
  });

  it('includes trimmed Sentry env vars when set', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '  https://example.ingest.sentry.io/123  ');
    vi.stubEnv('VITE_SENTRY_RELEASE', ' web@1.0.0 ');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', ' staging ');

    const { beakerstackObservabilityConfig } = await import('../observability');

    expect(beakerstackObservabilityConfig).toEqual({
      project: 'beakerstack',
      environment: 'staging',
      dsn: 'https://example.ingest.sentry.io/123',
      release: 'web@1.0.0',
    });
  });

  it('ignores blank Sentry env vars', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_SENTRY_DSN', '   ');
    vi.stubEnv('VITE_SENTRY_RELEASE', '');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', '\t');

    const { beakerstackObservabilityConfig } = await import('../observability');

    expect(beakerstackObservabilityConfig).toEqual({
      project: 'beakerstack',
      environment: 'production',
    });
  });
});

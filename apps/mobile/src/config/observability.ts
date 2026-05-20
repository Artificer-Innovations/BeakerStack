import type { ObservabilityConfig } from '@beakerstack/observability';

const env = typeof process !== 'undefined' && process.env ? process.env : {};

const sentryRelease = env.EXPO_PUBLIC_SENTRY_RELEASE;

export const beakerstackObservabilityConfig: ObservabilityConfig = {
  project: 'beakerstack-mobile',
  environment:
    env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ??
    (__DEV__ ? 'development' : 'production'),
  dsn: env.EXPO_PUBLIC_SENTRY_DSN,
  ...(sentryRelease ? { release: sentryRelease } : {}),
};

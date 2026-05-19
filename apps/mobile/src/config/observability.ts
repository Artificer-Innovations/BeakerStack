import type { ObservabilityConfig } from '@beakerstack/observability';

export const beakerstackObservabilityConfig: ObservabilityConfig = {
  project: 'beakerstack-mobile',
  environment: process.env.NODE_ENV ?? 'development',
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
};

import type { ObservabilityConfig } from '@beakerstack/observability';

const sentryRelease = import.meta.env.VITE_SENTRY_RELEASE;

export const beakerstackObservabilityConfig: ObservabilityConfig = {
  project: 'beakerstack',
  environment:
    import.meta.env.VITE_SENTRY_ENVIRONMENT ??
    import.meta.env.MODE ??
    'development',
  dsn: import.meta.env.VITE_SENTRY_DSN,
  ...(sentryRelease ? { release: sentryRelease } : {}),
};

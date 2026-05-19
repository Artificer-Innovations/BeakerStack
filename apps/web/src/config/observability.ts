import type { ObservabilityConfig } from '@beakerstack/observability';

export const beakerstackObservabilityConfig: ObservabilityConfig = {
  project: 'beakerstack',
  environment: import.meta.env.MODE ?? 'development',
  dsn: import.meta.env.VITE_SENTRY_DSN,
};

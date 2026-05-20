import type { ObservabilityConfig } from '@beakerstack/observability';

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const sentryRelease = optionalEnv(import.meta.env.VITE_SENTRY_RELEASE);
const sentryEnvironment = optionalEnv(import.meta.env.VITE_SENTRY_ENVIRONMENT);
const sentryDsn = optionalEnv(import.meta.env.VITE_SENTRY_DSN);

export const beakerstackObservabilityConfig: ObservabilityConfig = {
  project: 'beakerstack',
  environment: sentryEnvironment ?? import.meta.env.MODE ?? 'development',
  ...(sentryDsn ? { dsn: sentryDsn } : {}),
  ...(sentryRelease ? { release: sentryRelease } : {}),
};

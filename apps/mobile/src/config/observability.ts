import type { ObservabilityConfig } from '@beakerstack/observability';

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const env = typeof process !== 'undefined' && process.env ? process.env : {};

const sentryRelease = optionalEnv(env['EXPO_PUBLIC_SENTRY_RELEASE']);
const sentryEnvironment = optionalEnv(env['EXPO_PUBLIC_SENTRY_ENVIRONMENT']);
const sentryDsn = optionalEnv(env['EXPO_PUBLIC_SENTRY_DSN']);

export const beakerstackObservabilityConfig: ObservabilityConfig = {
  project: 'beakerstack-mobile',
  environment: sentryEnvironment ?? (__DEV__ ? 'development' : 'production'),
  ...(sentryDsn ? { dsn: sentryDsn } : {}),
  ...(sentryRelease ? { release: sentryRelease } : {}),
};

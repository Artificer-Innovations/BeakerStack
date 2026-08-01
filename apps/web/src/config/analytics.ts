import type { AnalyticsConfig } from '@beakerstack/analytics/web';

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function envFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

const plausibleDomain = optionalEnv(import.meta.env.VITE_PLAUSIBLE_DOMAIN);
const plausibleEndpoint = optionalEnv(import.meta.env.VITE_PLAUSIBLE_ENDPOINT);
const captureOnLocalhost = envFlag(
  import.meta.env.VITE_PLAUSIBLE_CAPTURE_ON_LOCALHOST
);

export const analyticsConfig: AnalyticsConfig = {
  ...(plausibleDomain ? { domain: plausibleDomain } : {}),
  ...(plausibleEndpoint ? { endpoint: plausibleEndpoint } : {}),
  ...(captureOnLocalhost ? { captureOnLocalhost: true } : {}),
};

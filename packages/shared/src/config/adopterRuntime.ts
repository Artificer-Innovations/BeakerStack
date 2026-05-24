import { adopterConfigSchema, type AdopterConfig } from './adopterConfigSchema';

let configured: AdopterConfig | null = null;
let configureWarningShown = false;

export function configureAdopter(config: AdopterConfig): void {
  if (configured !== null) {
    if (!configureWarningShown) {
      configureWarningShown = true;
      const message =
        'configureAdopter() called more than once; subsequent calls replace the config';
      if (
        typeof process !== 'undefined' &&
        process.env?.['NODE_ENV'] === 'test'
      ) {
        throw new Error(message);
      }
      // eslint-disable-next-line no-console -- intentional dev-time warning
      console.warn(message);
    }
  }
  configured = adopterConfigSchema.parse(config);
}

export function getAdopterConfig(): AdopterConfig {
  if (configured) {
    return configured;
  }
  throw new Error(
    'configureAdopter() must be called before reading adopter config'
  );
}

export function resetAdopterConfigForTests(): void {
  configured = null;
  configureWarningShown = false;
}

export function ensureAdopterConfigured(config: AdopterConfig): void {
  if (configured === null) {
    configureAdopter(config);
  }
}

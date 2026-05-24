import { adopterConfigSchema, type AdopterConfig } from './adopterConfigSchema';

let configured: AdopterConfig | null = null;

export function configureAdopter(config: AdopterConfig): void {
  if (configured !== null) {
    throw new Error(
      'configureAdopter() called more than once; call resetAdopterConfigForTests() in tests or use ensureAdopterConfigured() only for lazy-init helpers'
    );
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
}

/**
 * Idempotent variant of configureAdopter — safe to call when config may already
 * be set. Use only for test helpers and lazy-init paths that cannot guarantee a
 * single bootstrap call. App entry points should call configureAdopter().
 */
export function ensureAdopterConfigured(config: AdopterConfig): void {
  if (configured === null) {
    configureAdopter(config);
  }
}

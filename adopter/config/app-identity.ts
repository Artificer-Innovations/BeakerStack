import { branding } from './branding';

/** Adopter product identifiers — rename via `npm run rename` (adopter scope only). */
export const appIdentity = {
  productId: branding.flatName,
  observabilityProject: branding.flatName,
  deepLinkScheme: branding.slug,
} as const;

export type AppIdentity = typeof appIdentity;

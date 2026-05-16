import { BRANDING } from './branding';

export const LEGAL_CONFIG = {
  brandName: BRANDING.displayName,
  brandUrl: 'BeakerStack.com',
  legalEntityName: 'Artificer Innovations, LLC',
  contactEmail: 'contact@artificerinnovations.com',
} as const;

export type LegalConfig = typeof LEGAL_CONFIG;

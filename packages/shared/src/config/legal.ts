import { BRANDING } from './branding';

export const LEGAL_CONFIG = {
  brandName: BRANDING.displayName,
  brandUrl: 'BeakerStack.com',
  legalEntityName: 'Artificer Innovations, LLC',
  contactEmail: 'contact@artificerinnovations.com',
  mailingAddress: '522 W RIVERSIDE AVE STE N, SPOKANE, WA 99201, USA',
} as const;

export type LegalConfig = typeof LEGAL_CONFIG;

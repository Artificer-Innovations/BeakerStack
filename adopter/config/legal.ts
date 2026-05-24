import { branding } from './branding';

export const legal = {
  brandName: branding.displayName,
  brandUrl: 'BeakerStack.com',
  legalEntityName: 'Artificer Innovations, LLC',
  contactEmail: 'contact@artificerinnovations.com',
  mailingAddress: '522 W RIVERSIDE AVE STE N, SPOKANE, WA 99201, USA',
} as const;

export type Legal = typeof legal;

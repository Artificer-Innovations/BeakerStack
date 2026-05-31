import { branding } from './branding';

export const legal = {
  brandName: branding.displayName,
  brandUrl: 'https://beakerstack.com',
  legalEntityName: 'Artificer Innovations, LLC',
  contactEmail: 'contact@artificerinnovations.com',
  contactPhone: '',
  mailingAddress: '522 W RIVERSIDE AVE STE N, SPOKANE, WA 99201, USA',
} as const;

export type Legal = typeof legal;

import { branding } from './branding';
import { legal } from './legal';
import type { AdopterConfig } from '@beakerstack/shared/config/adopterConfigSchema';

export const adopterConfig: AdopterConfig = {
  branding,
  legal,
  postLoginPath: '/dashboard',
  postLoginPathMobile: 'Dashboard',
};

export { branding } from './branding';
export { legal } from './legal';
export { appIdentity } from './app-identity';

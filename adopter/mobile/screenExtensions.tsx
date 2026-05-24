import type { AdopterScreenExtension } from '@beakerstack/shared/navigation/adopterExtensions';
import DashboardScreen from './screens/DashboardScreen';

export const adopterStackScreens: AdopterScreenExtension[] = [
  {
    name: 'Dashboard',
    component: DashboardScreen as AdopterScreenExtension['component'],
    auth: 'protected',
  },
];

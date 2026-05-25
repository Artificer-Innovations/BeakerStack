jest.mock('../screens/DashboardScreen', () => ({
  __esModule: true,
  default: function MockDashboardScreen() {
    return null;
  },
}));

import { adopterStackScreens } from '../screenExtensions';

describe('adopterStackScreens', () => {
  it('registers the protected dashboard screen', () => {
    expect(adopterStackScreens).toHaveLength(1);
    expect(adopterStackScreens[0]).toMatchObject({
      name: 'Dashboard',
      auth: 'protected',
    });
    expect(adopterStackScreens[0]?.component).toBeDefined();
  });
});

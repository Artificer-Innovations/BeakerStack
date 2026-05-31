import type { AdopterConfig } from '@beakerstack/shared/config/adopterConfigSchema';

export const TEST_ADOPTER_FIXTURE: AdopterConfig = {
  branding: {
    displayName: 'Test App',
    shortName: 'Test App',
    slug: 'test-app',
    camelName: 'testApp',
    pascalName: 'TestApp',
    snakeName: 'test_app',
    upperSnakeName: 'TEST_APP',
    flatName: 'testapp',
  },
  legal: {
    brandName: 'Test App',
    brandUrl: 'https://testapp.com',
    legalEntityName: 'Test Entity LLC',
    contactEmail: 'test@example.com',
    contactPhone: '',
    mailingAddress: '123 Test St, Test City, TS 00000, USA',
  },
  postLoginPath: '/dashboard',
  postLoginPathMobile: 'Dashboard',
};

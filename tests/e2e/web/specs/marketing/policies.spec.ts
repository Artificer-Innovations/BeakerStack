import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

const policies = [
  { path: '/terms', heading: 'Terms of Service' },
  { path: '/privacy', heading: 'Privacy Policy' },
  { path: '/refunds', heading: 'Refunds Policy' },
] as const;

test.describe('Policy pages', () => {
  for (const policy of policies) {
    test(`renders ${policy.heading}`, async ({ page }) => {
      await gotoRoute(page, policy.path);

      await expect(
        page.getByRole('heading', { name: policy.heading, level: 1 })
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    });
  }
});

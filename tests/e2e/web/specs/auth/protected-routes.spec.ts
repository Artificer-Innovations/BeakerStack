import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Protected routes', () => {
  test('redirects unauthenticated dashboard visit to home', async ({
    page,
  }) => {
    await gotoRoute(page, '/dashboard');

    await expect(page).not.toHaveURL(/\/dashboard/);
    await expect(
      page.getByText('Everything you need to ship a real product.')
    ).toBeVisible();
  });
});

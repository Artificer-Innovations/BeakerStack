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

  test('redirects unauthenticated profile visit to home', async ({ page }) => {
    await gotoRoute(page, '/profile');

    await expect(page).not.toHaveURL(/\/profile/);
    await expect(
      page.getByText('Everything you need to ship a real product.')
    ).toBeVisible();
  });

  test('redirects unauthenticated billing visit to home', async ({ page }) => {
    await gotoRoute(page, '/billing');

    await expect(page).not.toHaveURL(/\/billing/);
    await expect(
      page.getByText('Everything you need to ship a real product.')
    ).toBeVisible();
  });
});

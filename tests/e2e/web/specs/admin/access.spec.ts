import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Admin access', () => {
  test('redirects non-admin users to not authorized', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/admin');

    await expect(page).toHaveURL(/\/not-authorized/);
    await expect(
      page.getByRole('heading', { name: 'Not authorized' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Go to dashboard' })
    ).toBeVisible();
  });

  test('allows admin users to view admin overview', async ({
    adminPage: page,
  }) => {
    await gotoRoute(page, '/admin');

    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(
      page.getByRole('heading', { name: 'Overview', level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Users', exact: true })
    ).toBeVisible();
    await expect(page.getByText(/Operator overview/i)).toBeVisible();
  });

  test('admin can open users page from overview', async ({
    adminPage: page,
  }) => {
    await gotoRoute(page, '/admin');
    await page.getByRole('link', { name: 'Users', exact: true }).click();

    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(
      page.getByRole('heading', { name: 'Users', level: 2 })
    ).toBeVisible();
  });

  test('overview shows operator cards', async ({ adminPage: page }) => {
    await gotoRoute(page, '/admin');

    await expect(
      page.getByRole('link', { name: 'Users', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Waitlist', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Waitlist Settings/ })
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: /Marketing email Not configured|Marketing email Enabled|Marketing email Disabled/,
      })
    ).toBeVisible();
  });
});

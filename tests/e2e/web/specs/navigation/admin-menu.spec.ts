import {
  test,
  expect,
  gotoRoute,
  openUserMenu,
} from '../../fixtures/auth.fixture';

test.describe('Admin menu navigation', () => {
  test('admin user sees Admin link in user menu', async ({
    adminPage: page,
  }) => {
    await gotoRoute(page, '/dashboard');
    await openUserMenu(page);

    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test('non-admin user does not see Admin link', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/dashboard');
    await openUserMenu(page);

    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });
});

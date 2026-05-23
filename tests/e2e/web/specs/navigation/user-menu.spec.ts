import {
  test,
  expect,
  gotoRoute,
  openUserMenu,
} from '../../fixtures/auth.fixture';

test.describe('Authenticated navigation', () => {
  test('user menu links reach profile, billing, and dashboard', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/dashboard');
    await openUserMenu(page);

    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(
      page.getByRole('button', { name: 'Edit Profile' })
    ).toBeVisible({ timeout: 15_000 });

    await openUserMenu(page);
    await page.getByRole('link', { name: 'Billing' }).click();
    await expect(page).toHaveURL(/\/billing\/?$/);
    await expect(
      page.getByRole('heading', { name: 'Billing', level: 1 })
    ).toBeVisible();

    await openUserMenu(page);
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Developer Demo')).toBeVisible();
  });
});

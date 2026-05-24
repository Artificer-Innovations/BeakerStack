import {
  test,
  expect,
  gotoRoute,
  openUserMenu,
} from '../../fixtures/auth.fixture';

test.describe('Admin navigation', () => {
  test('sidebar reaches all admin sections', async ({ adminPage: page }) => {
    await gotoRoute(page, '/admin');

    const nav = page.getByRole('navigation', { name: 'Admin navigation' });
    await expect(nav.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(
      nav.getByRole('link', { name: 'Waitlist', exact: true })
    ).toBeVisible();
    await expect(
      nav.getByRole('link', { name: 'Waitlist settings' })
    ).toBeVisible();
    await expect(
      nav.getByRole('link', { name: 'Marketing email settings' })
    ).toBeVisible();

    await nav.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await nav.getByRole('link', { name: 'Waitlist', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/waitlist\/?$/);
    await nav.getByRole('link', { name: 'Waitlist settings' }).click();
    await expect(page).toHaveURL(/\/admin\/waitlist\/settings/);
    await nav.getByRole('link', { name: 'Marketing email settings' }).click();
    await expect(page).toHaveURL(/\/admin\/marketing-email\/settings/);
  });

  test('user menu Admin link opens admin overview', async ({
    adminPage: page,
  }) => {
    await gotoRoute(page, '/dashboard');
    await openUserMenu(page);
    await page.getByRole('link', { name: 'Admin' }).click();

    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(
      page.getByRole('heading', { name: 'Overview', level: 2 })
    ).toBeVisible();
  });

  test('sidebar footer links to dashboard', async ({ adminPage: page }) => {
    await gotoRoute(page, '/admin');
    await page
      .getByTestId('sidebar-footer')
      .getByRole('link', {
        name: 'Dashboard',
      })
      .click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

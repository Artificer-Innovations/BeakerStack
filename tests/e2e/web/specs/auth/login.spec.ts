import {
  test,
  expect,
  gotoRoute,
  fillLoginForm,
} from '../../fixtures/auth.fixture';

test.describe('Login', () => {
  test('signs in seeded user and lands on dashboard', async ({
    page,
    seedUser,
  }) => {
    await gotoRoute(page, '/login');
    await expect(
      page.getByRole('heading', { name: 'Sign in to your account' })
    ).toBeVisible();

    await fillLoginForm(page, seedUser.email, seedUser.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Developer Demo')).toBeVisible();
  });
});

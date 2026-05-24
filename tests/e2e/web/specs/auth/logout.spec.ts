import {
  test,
  expect,
  gotoRoute,
  signOut,
  fillLoginForm,
} from '../../fixtures/auth.fixture';
import { isLandingPathname } from '../../env';

test.describe('Logout', () => {
  test('signs out from user menu and returns to landing', async ({
    authenticatedPage: page,
    seedUser: user,
  }) => {
    await gotoRoute(page, '/dashboard');
    await expect(page.getByText('Developer Demo')).toBeVisible();

    await signOut(page);

    await expect(page).toHaveURL(url => isLandingPathname(url.pathname));
    await expect(
      page.getByText('Everything you need to ship a real product.')
    ).toBeVisible();

    await gotoRoute(page, '/dashboard');
    await expect(page).not.toHaveURL(/\/dashboard/);

    await gotoRoute(page, '/login');
    await fillLoginForm(page, user.email, user.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

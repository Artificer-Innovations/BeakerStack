import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Login validation', () => {
  test('requires email and password before submit', async ({ page }) => {
    await gotoRoute(page, '/login');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.locator('form input:invalid')).toHaveCount(2);
    await expect(page).toHaveURL(/\/login/);
  });

  test('links to signup from login page', async ({ page }) => {
    await gotoRoute(page, '/login');
    await page
      .getByRole('link', { name: "Don't have an account? Sign up" })
      .click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByText('Create your account')).toBeVisible();
  });
});

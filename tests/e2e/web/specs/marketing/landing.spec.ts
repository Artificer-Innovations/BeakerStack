import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Marketing landing', () => {
  test('shows hero content and signup CTA', async ({ page }) => {
    await gotoRoute(page, '/');

    await expect(page.getByText('Beaker Stack').first()).toBeVisible();
    await expect(
      page.getByText('Everything you need to ship a real product.')
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Get started', exact: true })
    ).toBeVisible();
  });

  test('navigates to signup from Get started CTA', async ({ page }) => {
    await gotoRoute(page, '/');
    await page.getByRole('link', { name: 'Get started', exact: true }).click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByText('Create your account')).toBeVisible();
  });
});

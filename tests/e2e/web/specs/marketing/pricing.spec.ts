import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Marketing pricing section', () => {
  test('renders plan tiers and signup CTAs in open mode', async ({ page }) => {
    await gotoRoute(page, '/');
    await page.locator('#pricing').scrollIntoViewIfNeeded();

    await expect(
      page.getByRole('heading', { name: 'Simple, transparent pricing.' })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Free', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Max', { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Get started free' })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: 'Get started with Pro' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Get started with Pro' }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});

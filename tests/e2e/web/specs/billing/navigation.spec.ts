import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Billing navigation', () => {
  test('navigates across billing tabs', async ({ authenticatedPage: page }) => {
    await gotoRoute(page, '/billing');
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();

    await page.getByRole('link', { name: 'Usage' }).click();
    await expect(page).toHaveURL(/\/billing\/usage/);
    await expect(
      page.getByRole('heading', { name: 'Usage', level: 2 })
    ).toBeVisible();

    await page.getByRole('link', { name: 'Plans' }).click();
    await expect(page).toHaveURL(/\/billing\/plans/);
    await expect(
      page.getByRole('heading', { name: 'Choose a plan', level: 2 })
    ).toBeVisible();

    await page.getByRole('link', { name: 'Invoices' }).click();
    await expect(page).toHaveURL(/\/billing\/invoices/);
    await expect(
      page.getByRole('heading', { name: 'Invoices', level: 2 })
    ).toBeVisible();
  });
});

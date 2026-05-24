import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Billing overview', () => {
  test('shows billing hub with current plan context', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/billing');

    await expect(
      page.getByRole('heading', { name: 'Billing', level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Billing sections' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(page.getByText("This month's usage").first()).toBeVisible();
  });
});

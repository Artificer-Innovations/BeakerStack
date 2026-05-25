import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Billing usage', () => {
  test('shows usage meters and plan limits', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/billing/usage');

    await expect(
      page.getByRole('heading', { name: 'Usage', level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Limits', level: 2 })
    ).toBeVisible();
    await expect(page.getByText(/usage resets/i)).toBeVisible();
  });
});

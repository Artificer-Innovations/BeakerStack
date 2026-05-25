import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Billing plans', () => {
  test('lists available plans for authenticated users', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/billing/plans');

    await expect(
      page.getByRole('heading', { name: 'Choose a plan', level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Free', level: 3 })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Pro', level: 3 })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Max', level: 3 })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Current plan' }).first()
    ).toBeVisible();
  });
});

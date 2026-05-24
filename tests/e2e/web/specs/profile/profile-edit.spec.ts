import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Profile', () => {
  test('updates display name from profile editor', async ({
    authenticatedPage: page,
  }) => {
    const updatedName = `E2E User ${Date.now()}`;

    await gotoRoute(page, '/profile');
    await expect(
      page.getByRole('button', { name: 'Edit Profile' })
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.getByLabel('Display Name').fill(updatedName);
    await page.getByRole('button', { name: 'Update Profile' }).click();

    await expect(
      page.getByRole('button', { name: 'Edit Profile' })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(updatedName).first()).toBeVisible();
  });
});

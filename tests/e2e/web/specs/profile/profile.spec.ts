import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Profile', () => {
  test.describe.configure({ mode: 'serial' });

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
    await expect(
      page.getByRole('heading', { name: updatedName, level: 2 })
    ).toBeVisible();
  });

  test('edits bio, website, and location then persists after reload', async ({
    authenticatedPage: page,
  }) => {
    const bio = `E2E bio ${Date.now()}`;
    const website = 'https://example.com/e2e-profile';
    const location = 'Test City';

    await gotoRoute(page, '/profile');
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.getByLabel('Bio').fill(bio);
    await page.getByLabel('Website').fill(website);
    await page.getByLabel('Location').fill(location);
    await page.getByRole('button', { name: 'Update Profile' }).click();

    await expect(page.getByText(bio)).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('link', { name: 'example.com/e2e-profile' })
    ).toBeVisible();
    await expect(page.getByText(location)).toBeVisible();

    await page.reload();
    await expect(page.getByText(bio)).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('link', { name: 'example.com/e2e-profile' })
    ).toBeVisible();
    await expect(page.getByText(location)).toBeVisible();
  });
});

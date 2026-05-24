import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import { generateE2ETestEmail } from '../../../../utils/test-emails';
import {
  createTestUser,
  cleanupTestData,
  waitForUserProfile,
} from '../../../../utils/test-helpers';
import { createWebTestClient } from '../../../../utils/test-clients';

test.describe('Admin users', () => {
  test.describe.configure({ mode: 'serial' });
  test('searches by email and opens detail drawer', async ({
    adminPage: page,
  }) => {
    const email = generateE2ETestEmail();
    const password = `E2e_${Date.now()}_admin_Aa1`;
    const supabase = createWebTestClient();
    const { userId } = await createTestUser(supabase, email, password);
    await waitForUserProfile(supabase, userId);

    try {
      await gotoRoute(page, '/admin/users');
      await expect(
        page.getByRole('heading', { name: 'Users', level: 2 })
      ).toBeVisible();
      await page.getByPlaceholder('Search by email…').fill(email);
      const userRow = page.getByRole('button', {
        name: `View details for ${email}`,
      });
      await expect(userRow).toBeVisible({ timeout: 15_000 });
      await userRow.click();

      await expect(page.getByTestId('admin-drawer-backdrop')).toBeVisible();
      await expect(page.getByLabel('Close')).toBeVisible({ timeout: 15_000 });
    } finally {
      await cleanupTestData(supabase, userId, { email });
    }
  });

  test('lists a newly created user in the table', async ({
    adminPage: page,
  }) => {
    const email = generateE2ETestEmail();
    const password = `E2e_${Date.now()}_admin_Aa1`;
    const supabase = createWebTestClient();
    const { userId } = await createTestUser(supabase, email, password);
    await waitForUserProfile(supabase, userId);

    try {
      await gotoRoute(page, '/admin/users');
      await page.getByPlaceholder('Search by email…').fill(email);
      await expect(
        page.getByRole('button', { name: `View details for ${email}` })
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await cleanupTestData(supabase, userId, { email });
    }
  });
});

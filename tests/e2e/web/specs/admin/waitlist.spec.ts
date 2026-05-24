import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import { generateE2ETestEmail } from '../../../../utils/test-emails';
import {
  deleteWaitlistEntry,
  seedWaitlistEntry,
} from '../../fixtures/waitlist-data.fixture';
import { findWaitlistEntryByEmail } from '../../../../utils/integration-fixtures';

test.describe('Admin waitlist', () => {
  test.describe.configure({ mode: 'serial' });
  test('invites by email from admin panel', async ({ adminPage: page }) => {
    const email = generateE2ETestEmail();

    await gotoRoute(page, '/admin/waitlist');
    await expect(
      page.getByRole('heading', { name: 'Waitlist', level: 2 })
    ).toBeVisible();
    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button', { name: 'Send invite' }).click();

    try {
      await expect(page.getByText(`Invite created for ${email}`)).toBeVisible({
        timeout: 15_000,
      });
      await expect(
        page.getByRole('button', { name: 'Copy invite link' })
      ).toBeVisible();
    } finally {
      const entry = await findWaitlistEntryByEmail(email);
      if (entry) {
        await deleteWaitlistEntry(entry.id);
      }
    }
  });

  test('approves a pending entry from the detail drawer', async ({
    adminPage: page,
  }) => {
    const email = generateE2ETestEmail();
    let entry: Awaited<ReturnType<typeof seedWaitlistEntry>> | null = null;

    try {
      entry = await seedWaitlistEntry(email);
      await gotoRoute(page, '/admin/waitlist');
      await page.getByPlaceholder('Search by email').fill(email);
      const entryRow = page.getByRole('button', {
        name: `View details for ${entry.id}`,
      });
      await expect(entryRow).toBeVisible({ timeout: 15_000 });
      await entryRow.click();

      await page.getByRole('button', { name: 'Approve' }).click();
      await expect(
        page.getByRole('button', { name: 'Copy invite link' })
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      if (entry) {
        await deleteWaitlistEntry(entry.id);
      }
    }
  });
});

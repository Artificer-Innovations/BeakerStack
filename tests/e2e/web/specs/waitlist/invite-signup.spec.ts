import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import { generateE2ETestEmail } from '../../../../utils/test-emails';
import {
  approveWaitlistEntryByEmail,
  deleteWaitlistEntry,
  seedWaitlistEntry,
} from '../../fixtures/waitlist-data.fixture';
import {
  isWaitlistEdgeReady,
  restoreSignupMode,
  setSignupModeForTests,
} from '../../fixtures/waitlist.fixture';

test.describe('Waitlist invite signup', () => {
  test.describe.configure({ mode: 'serial' });

  let previousMode: Awaited<ReturnType<typeof setSignupModeForTests>>;

  test.beforeAll(async () => {
    previousMode = await setSignupModeForTests('invite_only');
  });

  test.afterAll(async () => {
    await restoreSignupMode(previousMode);
  });

  test('completes signup from approved invite token', async ({ page }) => {
    test.skip(!isWaitlistEdgeReady(), 'requires waitlist-ops edge function');

    const email = generateE2ETestEmail();
    const password = `E2e_${Date.now()}_invite_Aa1`;
    await seedWaitlistEntry(email);
    const { entryId, inviteToken } = await approveWaitlistEntryByEmail(email);

    try {
      await gotoRoute(page, `/signup/invite#token=${inviteToken}`);
      await expect(
        page.getByRole('heading', { name: 'Complete your signup' })
      ).toBeVisible({ timeout: 15_000 });
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirm-password"]').fill(password);
      await page.getByRole('button', { name: 'Create account' }).click();

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    } finally {
      await deleteWaitlistEntry(entryId);
    }
  });
});

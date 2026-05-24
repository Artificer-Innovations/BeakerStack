import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import { generateE2ETestEmail } from '../../../../utils/test-emails';
import {
  approveWaitlistEntryByEmail,
  deleteWaitlistEntry,
  seedWaitlistEntry,
} from '../../fixtures/waitlist-data.fixture';
import {
  isWaitlistEdgeReady,
  resolveWaitlistEdgeReady,
  restoreSignupMode,
  setSignupModeForTests,
} from '../../fixtures/waitlist.fixture';

test.describe('Waitlist invite signup', () => {
  test.describe.configure({ mode: 'serial' });

  let previousMode: Awaited<ReturnType<typeof setSignupModeForTests>>;
  let waitlistEdgeReady = isWaitlistEdgeReady();
  let waitlistEdgeSkipReason =
    'Requires deployed waitlist-capture and waitlist-ops edge functions on preview';

  test.beforeAll(async () => {
    previousMode = await setSignupModeForTests('invite_only');
    if (!isWaitlistEdgeReady()) {
      waitlistEdgeReady = false;
      waitlistEdgeSkipReason =
        'Waitlist edge E2E disabled (set E2E_WAITLIST_READY=1 or run in CI/preview).';
      console.log(
        `[e2e] Waitlist edge probe skipped: ${waitlistEdgeSkipReason}`
      );
      return;
    }
    try {
      const probe = await resolveWaitlistEdgeReady();
      waitlistEdgeReady = probe.ready;
      waitlistEdgeSkipReason = probe.reason;
      console.log(
        `[e2e] Waitlist edge probe: ${probe.ready ? 'ready' : 'not ready'} — ${probe.reason}`
      );
    } catch (error) {
      waitlistEdgeReady = false;
      waitlistEdgeSkipReason =
        error instanceof Error ? error.message : String(error);
      console.log(`[e2e] Waitlist edge probe error: ${waitlistEdgeSkipReason}`);
    }
  });

  test.afterAll(async () => {
    await restoreSignupMode(previousMode);
  });

  test.beforeEach(({ page: _page }, testInfo) => {
    testInfo.skip(!waitlistEdgeReady, waitlistEdgeSkipReason);
  });

  test('completes signup from approved invite token', async ({ page }) => {
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

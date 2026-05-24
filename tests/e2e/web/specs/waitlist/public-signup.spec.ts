import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import { generateE2ETestEmail } from '../../../../utils/test-emails';
import {
  isWaitlistEdgeReady,
  resolveWaitlistEdgeReady,
  restoreSignupMode,
  setSignupModeForTests,
} from '../../fixtures/waitlist.fixture';

test.describe('Waitlist public signup', () => {
  test.describe.configure({ mode: 'serial' });

  let previousMode: Awaited<ReturnType<typeof setSignupModeForTests>>;
  let waitlistEdgeReady = isWaitlistEdgeReady();
  let waitlistEdgeSkipReason =
    'Requires deployed waitlist-capture edge function on preview';

  test.beforeAll(async () => {
    previousMode = await setSignupModeForTests('waitlist');
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

  test('shows waitlist form and submits email', async ({ page }) => {
    const email = generateE2ETestEmail();

    await gotoRoute(page, '/signup');
    await expect(
      page.getByRole('heading', { name: 'Join the waitlist' })
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Join waitlist' }).click();

    await expect(page.getByRole('status')).toContainText(
      /on the list|waitlist/i,
      {
        timeout: 15_000,
      }
    );
  });
});

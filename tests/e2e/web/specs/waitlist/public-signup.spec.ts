import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import { generateE2ETestEmail } from '../../../../utils/test-emails';
import {
  isWaitlistEdgeReady,
  restoreSignupMode,
  setSignupModeForTests,
} from '../../fixtures/waitlist.fixture';

test.describe('Waitlist public signup', () => {
  test.describe.configure({ mode: 'serial' });

  let previousMode: Awaited<ReturnType<typeof setSignupModeForTests>>;

  test.beforeAll(async () => {
    previousMode = await setSignupModeForTests('waitlist');
  });

  test.afterAll(async () => {
    await restoreSignupMode(previousMode);
  });

  test('shows waitlist form and submits email', async ({ page }) => {
    const email = generateE2ETestEmail();

    await gotoRoute(page, '/signup');
    await expect(
      page.getByRole('heading', { name: 'Join the waitlist' })
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();

    test.skip(
      !isWaitlistEdgeReady(),
      'requires waitlist-capture edge function'
    );

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

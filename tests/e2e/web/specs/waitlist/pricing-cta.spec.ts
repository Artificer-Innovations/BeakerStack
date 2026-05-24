import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  restoreSignupMode,
  setSignupModeForTests,
} from '../../fixtures/waitlist.fixture';

test.describe('Waitlist pricing CTA', () => {
  test.describe.configure({ mode: 'serial' });

  let previousMode: Awaited<ReturnType<typeof setSignupModeForTests>>;

  test.beforeAll(async () => {
    previousMode = await setSignupModeForTests('waitlist');
  });

  test.afterAll(async () => {
    await restoreSignupMode(previousMode);
  });

  test('pricing CTA navigates to signup with plan intent', async ({ page }) => {
    await gotoRoute(page, '/#pricing');
    await page
      .getByRole('button', { name: 'Join the waitlist for Pro' })
      .click();

    await expect(page).toHaveURL(/\/signup.*plan=(beakerstack_pro|pro)/i);
  });
});

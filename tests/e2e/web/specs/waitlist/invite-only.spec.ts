import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  restoreSignupMode,
  setSignupModeForTests,
} from '../../fixtures/waitlist.fixture';

test.describe('Waitlist invite-only mode', () => {
  test.describe.configure({ mode: 'serial' });

  let previousMode: Awaited<ReturnType<typeof setSignupModeForTests>>;

  test.beforeAll(async () => {
    previousMode = await setSignupModeForTests('invite_only');
  });

  test.afterAll(async () => {
    await restoreSignupMode(previousMode);
  });

  test('blocks public signup without invite token', async ({ page }) => {
    await gotoRoute(page, '/signup');

    await expect(page.locator('input[name="password"]')).toHaveCount(0);
    await expect(page.getByText(/invite-only/i)).toBeVisible();
  });
});

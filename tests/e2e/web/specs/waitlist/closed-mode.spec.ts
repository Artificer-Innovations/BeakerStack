import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  restoreSignupMode,
  setSignupModeForTests,
} from '../../fixtures/waitlist.fixture';

test.describe('Waitlist closed mode', () => {
  test.describe.configure({ mode: 'serial' });

  let previousMode: Awaited<ReturnType<typeof setSignupModeForTests>>;

  test.beforeAll(async () => {
    previousMode = await setSignupModeForTests('closed');
  });

  test.afterAll(async () => {
    await restoreSignupMode(previousMode);
  });

  test('hides pricing and blocks signup', async ({ page }) => {
    await gotoRoute(page, '/');

    await expect(page.locator('#pricing')).toHaveCount(0);

    await gotoRoute(page, '/signup');
    await expect(page.locator('input[name="password"]')).toHaveCount(0);
    await expect(
      page.getByText('Sign ups are closed right now. Please check back later.')
    ).toBeVisible();
  });
});

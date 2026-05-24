import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  restoreSignupMode,
  setSignupModeForTests,
} from '../../fixtures/waitlist.fixture';

test.describe('Admin waitlist settings', () => {
  test.describe.configure({ mode: 'serial' });

  let previousMode: Awaited<ReturnType<typeof setSignupModeForTests>>;

  test.beforeAll(async () => {
    previousMode = await setSignupModeForTests('open');
  });

  test.afterAll(async () => {
    await restoreSignupMode(previousMode);
  });

  test('updates signup mode and saves settings', async ({
    adminPage: page,
  }) => {
    await gotoRoute(page, '/admin/waitlist/settings');

    await expect(
      page.getByRole('heading', { name: 'Waitlist settings', level: 2 })
    ).toBeVisible();
    await page.getByLabel('Signup mode').selectOption('waitlist');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('status')).toContainText('Settings saved');

    await gotoRoute(page, '/admin');
    await expect(
      page.getByRole('link', { name: 'Waitlist Settings Waitlist' })
    ).toBeVisible();

    await gotoRoute(page, '/admin/waitlist/settings');
    await page.getByLabel('Signup mode').selectOption('open');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('status')).toContainText('Settings saved');
  });
});

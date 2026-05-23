import { generateE2ETestEmail } from '../../../../utils/test-emails';
import { generateTestPassword } from '../../../../utils/test-helpers';
import {
  test,
  expect,
  gotoRoute,
  fillSignupForm,
} from '../../fixtures/auth.fixture';

test.describe('Signup', () => {
  test('creates an account or prompts for email confirmation', async ({
    page,
  }) => {
    const email = generateE2ETestEmail();
    const password = generateTestPassword();

    await gotoRoute(page, '/signup');
    await expect(page.getByText('Create your account')).toBeVisible();

    await fillSignupForm(page, email, password);
    await page.getByRole('button', { name: 'Create account' }).click();

    const dashboardReached = page
      .waitForURL(/\/dashboard/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    const awaitingEmail = page
      .getByRole('heading', { name: 'Check your email' })
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    const [onDashboard, onConfirmScreen] = await Promise.all([
      dashboardReached,
      awaitingEmail,
    ]);

    expect(onDashboard || onConfirmScreen).toBe(true);
  });
});

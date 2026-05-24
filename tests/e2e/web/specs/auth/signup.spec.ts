import { generateE2ETestEmail } from '../../../../utils/test-emails';
import { generateTestPassword } from '../../../../utils/test-helpers';
import {
  test,
  expect,
  gotoRoute,
  fillSignupForm,
  expectSignupOutcome,
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

    await expectSignupOutcome(page);
  });
});

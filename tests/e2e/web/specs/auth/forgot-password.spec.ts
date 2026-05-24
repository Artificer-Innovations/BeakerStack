import {
  test,
  expect,
  gotoRoute,
  expectPasswordResetConfirmation,
} from '../../fixtures/auth.fixture';

test.describe('Forgot password', () => {
  test('submits reset request and shows confirmation message', async ({
    page,
    seedUser,
  }) => {
    await gotoRoute(page, '/forgot-password');
    await expect(
      page.getByRole('heading', { name: 'Reset your password' })
    ).toBeVisible();

    await page.locator('input[name="email"]').fill(seedUser.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expectPasswordResetConfirmation(page, seedUser.email);
  });

  test('validates email is required', async ({ page }) => {
    await gotoRoute(page, '/forgot-password');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(
      page.getByText('Please enter your email address')
    ).toBeVisible();
  });

  test('shows expired link notice when expired query param is set', async ({
    page,
  }) => {
    await gotoRoute(page, '/forgot-password?expired=1');

    await expect(
      page.getByText(/password reset link has expired/i)
    ).toBeVisible();
  });
});

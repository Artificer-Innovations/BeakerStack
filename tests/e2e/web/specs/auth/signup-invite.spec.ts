import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Signup invite', () => {
  test('shows invalid invite message when token is missing', async ({
    page,
  }) => {
    await gotoRoute(page, '/signup/invite');

    await expect(
      page.getByText(/invite link is invalid or has expired/i)
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Sign in', exact: true }).last()
    ).toBeVisible();
  });
});

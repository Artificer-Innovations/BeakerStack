import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Admin marketing email settings', () => {
  test('loads settings form', async ({ adminPage: page }) => {
    await gotoRoute(page, '/admin/marketing-email/settings');

    await expect(
      page.getByRole('heading', { name: 'Marketing email settings', level: 2 })
    ).toBeVisible();
    await expect(page.getByText('Enable marketing email sync')).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: /Namespace/i })
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: /Kit form ID/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Save settings' })
    ).toBeVisible();
  });
});

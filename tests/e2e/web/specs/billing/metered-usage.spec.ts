import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  recordAiUsage,
  resetBillingUsageForUser,
  resetDemoCollectionsForUser,
} from '../../fixtures/billing.fixture';

test.describe('Billing metered usage', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ seedUser }) => {
    await resetBillingUsageForUser(seedUser.userId);
    await resetDemoCollectionsForUser(seedUser.userId);
  });

  test('simulates AI summarize and reflects usage on billing page', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/dashboard');
    await expect(page.getByText('Developer Demo')).toBeVisible();
    await recordAiUsage(page);

    await gotoRoute(page, '/billing/usage');
    await expect(
      page.getByRole('heading', { name: 'Usage', level: 2 })
    ).toBeVisible();
    await expect(page.getByTestId('usage-indicator-expanded')).toBeVisible();
  });

  test('reaches collection limit on free plan', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/dashboard');

    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByRole('button', { name: 'New collection' }).click();
    await expect(
      page.getByRole('button', { name: 'Limit reached' })
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows add item control on dashboard demo', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/dashboard');
    await page.getByRole('button', { name: 'New collection' }).click();

    await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Add item' }).click();
    await expect(page.getByRole('button', { name: 'Summarize' })).toBeVisible();
  });
});

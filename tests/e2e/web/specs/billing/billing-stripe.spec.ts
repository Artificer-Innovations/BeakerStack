import { e2eStorageStatePath } from '../../env';
import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  completeStripeCheckout,
  expectPlanActive,
  isStripeCheckoutReady,
  probeStripeCheckoutReady,
  startProUpgradeCheckout,
} from '../../fixtures/stripe-checkout.fixture';

test.describe('Billing Stripe flows', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  let stripeCheckoutReady = isStripeCheckoutReady();

  test.beforeAll(async ({ browser }) => {
    if (!isStripeCheckoutReady()) {
      return;
    }
    const context = await browser.newContext({
      storageState: e2eStorageStatePath,
    });
    const page = await context.newPage();
    try {
      stripeCheckoutReady = await probeStripeCheckoutReady(page);
    } finally {
      await context.close();
    }
  });

  test.beforeEach(({ authenticatedPage: _page }, testInfo) => {
    testInfo.skip(
      !stripeCheckoutReady,
      'Requires preview billing-stripe checkout (STRIPE_* secrets, synced plans, BILLING_ALLOWED_ORIGINS)'
    );
  });

  test('upgrades Free to Pro via Stripe Checkout', async ({
    authenticatedPage: page,
  }) => {
    await startProUpgradeCheckout(page);
    await completeStripeCheckout(page);
    await expectPlanActive(page, 'Pro');
  });

  test('schedules downgrade to Free after Pro subscription', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/billing/plans');
    await page
      .locator('#plan-card-beakerstack_free')
      .getByRole('button', { name: 'Downgrade to Free' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Downgrade to Free?' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Confirm downgrade' }).click();

    await expect(page.getByText(/downgrade|scheduled|cancel/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('shows annual switch option for paid plan', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/billing/plans');
    await page.getByRole('button', { name: /Annually/i }).click();
    await expect(
      page.locator('#plan-card-beakerstack_pro').getByRole('button', {
        name: /Switch to annual/i,
      })
    ).toBeVisible();
  });

  test('loads invoices page after upgrade', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/billing/invoices');
    await expect(
      page.getByRole('heading', { name: 'Invoices', level: 2 })
    ).toBeVisible();
    await expect(
      page
        .getByRole('link', { name: 'Explore plans' })
        .or(page.locator('table'))
    ).toBeVisible();
  });
});

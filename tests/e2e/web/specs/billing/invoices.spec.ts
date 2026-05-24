import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  completeStripeCheckout,
  isStripeCheckoutReady,
} from '../../fixtures/stripe-checkout.fixture';

test.describe('Billing invoices', () => {
  test.setTimeout(120_000);

  test('loads invoices page after upgrade', async ({
    authenticatedPage: page,
  }) => {
    test.skip(!isStripeCheckoutReady(), 'Requires Stripe test mode + webhook');

    await gotoRoute(page, '/billing/plans');
    await page
      .locator('#plan-card-beakerstack_pro')
      .getByRole('button', { name: 'Upgrade to Pro' })
      .click();
    await completeStripeCheckout(page);

    await gotoRoute(page, '/billing/invoices');
    await expect(
      page.getByRole('heading', { name: 'Invoices', level: 2 })
    ).toBeVisible();
  });
});

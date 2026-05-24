import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  completeStripeCheckout,
  expectPlanActive,
  isStripeCheckoutReady,
} from '../../fixtures/stripe-checkout.fixture';

test.describe('Billing plan cadence', () => {
  test.setTimeout(120_000);

  test('shows annual switch option for paid plan', async ({
    authenticatedPage: page,
  }) => {
    test.skip(!isStripeCheckoutReady(), 'Requires Stripe test mode + webhook');

    await gotoRoute(page, '/billing/plans');
    await page
      .locator('#plan-card-beakerstack_pro')
      .getByRole('button', { name: 'Upgrade to Pro' })
      .click();
    await completeStripeCheckout(page);
    await expectPlanActive(page, 'Pro');

    await gotoRoute(page, '/billing/plans');
    await page.getByRole('button', { name: /Annually/i }).click();
    await expect(
      page.locator('#plan-card-beakerstack_pro').getByRole('button', {
        name: /Switch to annual/i,
      })
    ).toBeVisible();
  });
});

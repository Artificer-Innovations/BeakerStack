import { test, gotoRoute } from '../../fixtures/auth.fixture';
import {
  completeStripeCheckout,
  expectPlanActive,
  isStripeCheckoutReady,
} from '../../fixtures/stripe-checkout.fixture';

test.describe('Billing plan upgrade', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  test('upgrades Free to Pro via Stripe Checkout', async ({
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
  });
});

import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  completeStripeCheckout,
  expectPlanActive,
  isStripeCheckoutReady,
} from '../../fixtures/stripe-checkout.fixture';

test.describe('Billing plan downgrade', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  test('schedules downgrade to Free after Pro subscription', async ({
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
});

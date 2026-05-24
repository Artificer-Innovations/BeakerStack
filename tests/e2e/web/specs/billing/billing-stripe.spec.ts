import { readFileSync } from 'node:fs';
import {
  e2eStatePath,
  e2eStorageStatePath,
  type E2eSeedState,
} from '../../env';
import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';
import {
  expectCurrentPlan,
  resetBillingPlanForUser,
} from '../../fixtures/billing.fixture';
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
  let stripeCheckoutSkipReason =
    'Requires preview billing-stripe checkout (STRIPE_* secrets, synced plans, BILLING_ALLOWED_ORIGINS)';

  test.beforeAll(async ({ browser }) => {
    if (!isStripeCheckoutReady()) {
      stripeCheckoutSkipReason =
        'E2E Stripe checkout is disabled for this run (not CI/preview and E2E_STRIPE_READY is unset).';
      stripeCheckoutReady = false;
      console.log(
        `[e2e] Stripe checkout probe skipped: ${stripeCheckoutSkipReason}`
      );
      return;
    }
    const context = await browser.newContext({
      storageState: e2eStorageStatePath,
    });
    const page = await context.newPage();
    try {
      const probe = await probeStripeCheckoutReady(page);
      stripeCheckoutReady = probe.ready;
      stripeCheckoutSkipReason = probe.reason;
      console.log(
        `[e2e] Stripe checkout probe: ${probe.ready ? 'ready' : 'not ready'} — ${probe.reason}`
      );
    } catch (error) {
      stripeCheckoutReady = false;
      stripeCheckoutSkipReason =
        error instanceof Error ? error.message : String(error);
      console.log(
        `[e2e] Stripe checkout probe error: ${stripeCheckoutSkipReason}`
      );
    } finally {
      await context.close();
    }
  });

  test.afterAll(async () => {
    if (!stripeCheckoutReady) {
      return;
    }
    const seed = JSON.parse(readFileSync(e2eStatePath, 'utf8')) as E2eSeedState;
    await resetBillingPlanForUser(seed.userId);
  });

  test.beforeEach(({ authenticatedPage: _page }, testInfo) => {
    testInfo.skip(!stripeCheckoutReady, stripeCheckoutSkipReason);
  });

  test('upgrades Free to Pro via Stripe Checkout', async ({
    authenticatedPage: page,
  }) => {
    await startProUpgradeCheckout(page);
    await completeStripeCheckout(page);
    await expectPlanActive(page, 'Pro');
  });

  test('shows annual switch option for paid plan', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/billing/plans');
    await expectCurrentPlan(page, 'Pro');
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
    await gotoRoute(page, '/billing/plans');
    await expectCurrentPlan(page, 'Pro');
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

  test('schedules downgrade to Free after Pro subscription', async ({
    authenticatedPage: page,
  }) => {
    await gotoRoute(page, '/billing/plans');
    await expectCurrentPlan(page, 'Pro');
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

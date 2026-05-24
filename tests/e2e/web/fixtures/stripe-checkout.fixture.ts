import { expect, type Page } from '@playwright/test';
import { gotoRoute } from './auth.fixture';
import { expectCurrentPlan } from './billing.fixture';

const STRIPE_TEST_CARD = {
  number: '4242424242424242',
  exp: '1234',
  cvc: '123',
  zip: '12345',
};

export function isStripeCheckoutReady(): boolean {
  if (process.env.E2E_STRIPE_READY === '1') {
    return true;
  }
  if (process.env.E2E_TARGET === 'preview' || process.env.CI === 'true') {
    return true;
  }
  return false;
}

export async function startProUpgradeCheckout(page: Page): Promise<void> {
  await gotoRoute(page, '/billing/plans');

  const upgradeButton = page
    .locator('#plan-card-beakerstack_pro')
    .getByRole('button', { name: 'Upgrade to Pro' });
  await expect(upgradeButton).toBeVisible({ timeout: 15_000 });
  await expect(upgradeButton).toBeEnabled({ timeout: 15_000 });

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 }),
    upgradeButton.click(),
  ]);
}

export async function completeStripeCheckout(page: Page): Promise<void> {
  if (!/checkout\.stripe\.com/.test(page.url())) {
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  }

  const cardFrame = page
    .frameLocator(
      'iframe[name^="__privateStripeFrame"], iframe[title*="Secure"], iframe[src*="stripe"]'
    )
    .first();

  const numberInput = cardFrame
    .locator('input[name="cardnumber"], input[autocomplete="cc-number"]')
    .first();
  if (await numberInput.count()) {
    await numberInput.fill(STRIPE_TEST_CARD.number);
    await cardFrame
      .locator('input[name="exp-date"], input[autocomplete="cc-exp"]')
      .first()
      .fill(STRIPE_TEST_CARD.exp);
    await cardFrame
      .locator('input[name="cvc"], input[autocomplete="cc-csc"]')
      .first()
      .fill(STRIPE_TEST_CARD.cvc);
    const zip = cardFrame
      .locator('input[name="postal"], input[autocomplete="postal-code"]')
      .first();
    if (await zip.count()) {
      await zip.fill(STRIPE_TEST_CARD.zip);
    }
  } else {
    await page
      .locator('input[name="cardNumber"]')
      .fill(STRIPE_TEST_CARD.number);
    await page.locator('input[name="cardExpiry"]').fill('12 / 34');
    await page.locator('input[name="cardCvc"]').fill(STRIPE_TEST_CARD.cvc);
    const billingZip = page.locator('input[name="billingPostalCode"]');
    if (await billingZip.count()) {
      await billingZip.fill(STRIPE_TEST_CARD.zip);
    }
  }

  const payButton = page.getByRole('button', {
    name: /Pay|Subscribe|Start trial|Complete/i,
  });
  await payButton.click();

  await page.waitForURL(/\/billing(\?|$)/, { timeout: 120_000 });
}

export async function expectPlanActive(
  page: Page,
  planName: 'Free' | 'Pro' | 'Max'
): Promise<void> {
  await expect(async () => {
    await gotoRoute(page, '/billing/plans');
    await expectCurrentPlan(page, planName);
  }).toPass({ timeout: 45_000 });
}

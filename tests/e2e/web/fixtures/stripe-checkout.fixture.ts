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

function isBillingStripeCheckoutRequest(url: string, method: string): boolean {
  return method === 'POST' && /\/billing-stripe(?:\/|$)/.test(url);
}

async function readBillingStripeCheckoutFailure(
  page: Page
): Promise<string | null> {
  const errorText = page
    .locator('[role="alert"], [data-testid="billing-error"]')
    .first();
  if (await errorText.count()) {
    return (await errorText.textContent())?.trim() || null;
  }
  return null;
}

export async function startProUpgradeCheckout(page: Page): Promise<void> {
  await gotoRoute(page, '/billing/plans');

  const upgradeButton = page
    .locator('#plan-card-beakerstack_pro')
    .getByRole('button', { name: /Upgrade to Pro|Start .* free trial/i });
  await expect(upgradeButton).toBeVisible({ timeout: 15_000 });
  await expect(upgradeButton).toBeEnabled({ timeout: 15_000 });

  const checkoutResponse = page.waitForResponse(
    response =>
      isBillingStripeCheckoutRequest(
        response.url(),
        response.request().method()
      ),
    { timeout: 60_000 }
  );

  await upgradeButton.click();

  let response;
  try {
    response = await checkoutResponse;
  } catch {
    const uiError = await readBillingStripeCheckoutFailure(page);
    throw new Error(
      uiError
        ? `billing-stripe checkout request did not complete: ${uiError}`
        : 'billing-stripe checkout request did not complete (no response within 60s). Check preview billing-stripe deploy, STRIPE_* secrets, and BILLING_ALLOWED_ORIGINS.'
    );
  }

  const responseBody = await response.text();
  if (!response.ok()) {
    throw new Error(
      `billing-stripe checkout failed (${response.status()}): ${responseBody.slice(0, 500)}`
    );
  }

  let payload: { checkoutUrl?: string } | null = null;
  try {
    payload = JSON.parse(responseBody) as { checkoutUrl?: string };
  } catch {
    throw new Error(
      `billing-stripe checkout returned non-JSON: ${responseBody.slice(0, 500)}`
    );
  }

  if (!payload?.checkoutUrl) {
    throw new Error(
      `billing-stripe checkout missing checkoutUrl: ${responseBody.slice(0, 500)}`
    );
  }

  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
}

export type StripeCheckoutProbeResult = {
  ready: boolean;
  reason: string;
};

/** Returns false when preview billing-stripe cannot start checkout (plans not synced, etc.). */
export async function probeStripeCheckoutReady(
  page: Page
): Promise<StripeCheckoutProbeResult> {
  if (!isStripeCheckoutReady()) {
    return {
      ready: false,
      reason:
        'E2E Stripe checkout is disabled (set E2E_STRIPE_READY=1 or run in CI/preview).',
    };
  }

  await gotoRoute(page, '/billing/plans');

  const proCard = page.locator('#plan-card-beakerstack_pro');
  try {
    await expect(proCard).toBeVisible({ timeout: 15_000 });
  } catch {
    return {
      ready: false,
      reason:
        'Pro plan card did not appear on /billing/plans (billing catalog may still be loading or unavailable).',
    };
  }

  const upgradeButton = proCard.getByRole('button', {
    name: /Upgrade to Pro|Start .* free trial/i,
  });
  if (!(await upgradeButton.count())) {
    const buttonLabels = await proCard.getByRole('button').allTextContents();
    return {
      ready: false,
      reason: `No upgrade/trial button on Pro plan card (found: ${
        buttonLabels
          .map(label => label.trim())
          .filter(Boolean)
          .join(', ') || 'none'
      }).`,
    };
  }

  try {
    const checkoutResponse = page.waitForResponse(
      response =>
        isBillingStripeCheckoutRequest(
          response.url(),
          response.request().method()
        ),
      { timeout: 20_000 }
    );
    await upgradeButton.click();
    const response = await checkoutResponse;
    const responseBody = await response.text();
    if (!response.ok()) {
      return {
        ready: false,
        reason: `billing-stripe checkout failed (${response.status()}): ${responseBody.slice(0, 300)}`,
      };
    }
    let payload: { checkoutUrl?: string } | null = null;
    try {
      payload = JSON.parse(responseBody) as { checkoutUrl?: string };
    } catch {
      return {
        ready: false,
        reason: `billing-stripe checkout returned non-JSON: ${responseBody.slice(0, 300)}`,
      };
    }
    if (!payload?.checkoutUrl) {
      return {
        ready: false,
        reason: `billing-stripe checkout missing checkoutUrl: ${responseBody.slice(0, 300)}`,
      };
    }
    return { ready: true, reason: 'billing-stripe returned checkoutUrl.' };
  } catch (error) {
    const uiError = await readBillingStripeCheckoutFailure(page);
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ready: false,
      reason: uiError
        ? `billing-stripe checkout request did not complete: ${uiError} (${detail})`
        : `billing-stripe checkout request did not complete within 20s (${detail}). Check preview billing-stripe deploy, STRIPE_* secrets, synced plans, and BILLING_ALLOWED_ORIGINS.`,
    };
  }
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

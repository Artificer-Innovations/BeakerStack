import { expect, type Page } from '@playwright/test';
import {
  BILLING_PRODUCT_ID,
  BILLING_USAGE_EVENT,
} from '../../../utils/billing-fixtures';
import { createServiceRoleClient } from '../../../utils/test-clients';

export async function resetBillingUsageForUser(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error: eventsError } = await admin
    .from('billing_usage_events')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', BILLING_PRODUCT_ID)
    .eq('event_type', BILLING_USAGE_EVENT);
  if (eventsError) {
    throw new Error(
      `reset billing usage events failed: ${eventsError.message}`
    );
  }
  const { error: aggregatesError } = await admin
    .from('billing_usage_aggregates')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', BILLING_PRODUCT_ID)
    .eq('event_type', BILLING_USAGE_EVENT);
  if (aggregatesError) {
    throw new Error(
      `reset billing usage aggregates failed: ${aggregatesError.message}`
    );
  }
}

export async function resetDemoCollectionsForUser(
  userId: string
): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('billing_demo_collections')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', BILLING_PRODUCT_ID);
  if (error) {
    throw new Error(`reset demo collections failed: ${error.message}`);
  }
}

export async function recordAiUsage(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Simulate AI summarize' }).click();
}

export async function expectUsageSection(
  page: Page,
  label: string
): Promise<void> {
  await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
}

const PLAN_CARD_IDS = {
  Free: 'plan-card-beakerstack_free',
  Pro: 'plan-card-beakerstack_pro',
  Max: 'plan-card-beakerstack_max',
} as const;

export async function expectCurrentPlan(
  page: Page,
  planName: keyof typeof PLAN_CARD_IDS
): Promise<void> {
  const planCard = page.locator(`#${PLAN_CARD_IDS[planName]}`);
  await expect(
    planCard.getByRole('button', { name: 'Current plan' })
  ).toBeVisible();
}

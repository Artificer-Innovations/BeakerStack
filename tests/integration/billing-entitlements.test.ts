/**
 * Billing entitlements and RLS via authenticated Supabase RPCs.
 */

import { createWebTestClient } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  cleanupTestData,
} from '../utils/test-helpers';
import { uniqueTestEmail } from '../utils/integration-fixtures';
import {
  BILLING_FREE_PLAN_ID,
  BILLING_PRODUCT_ID,
  BILLING_PRO_PLAN_ID,
  BILLING_USAGE_EVENT,
  ensureFreeSubscription,
  getRemainingUsage,
  simulateProUpgrade,
} from '../utils/billing-fixtures';

describe('Billing entitlements integration', () => {
  const supabase = createWebTestClient();
  const other = createWebTestClient();
  let userId: string;
  let email: string;
  let password: string;
  let otherUserId: string;
  let otherEmail: string;
  let otherPassword: string;

  beforeAll(async () => {
    email = uniqueTestEmail();
    otherEmail = uniqueTestEmail();
    const u = await createTestUser(supabase, email);
    userId = u.userId;
    password = u.password;
    const o = await createTestUser(other, otherEmail);
    otherUserId = o.userId;
    otherPassword = o.password;
  });

  afterAll(async () => {
    await cleanupTestData(supabase, userId, { email });
    await cleanupTestData(other, otherUserId, { email: otherEmail });
  });

  it('creates a free subscription via ensure_billing_subscription', async () => {
    await signInTestUser(supabase, email, password);
    const row = await ensureFreeSubscription(supabase);

    expect(row.plan_id).toBe(BILLING_FREE_PLAN_ID);
    expect(row.product_id).toBe(BILLING_PRODUCT_ID);
    expect(row.user_id).toBe(userId);
  });

  it('returns remaining usage for the free plan', async () => {
    await signInTestUser(supabase, email, password);
    const usage = await getRemainingUsage(supabase);

    expect(usage.error).toBeUndefined();
    expect(Number(usage.limit)).toBe(30);
    expect(Number(usage.used)).toBeGreaterThanOrEqual(0);
  });

  it('upgrades via billing_demo_simulate_upgrade', async () => {
    await signInTestUser(supabase, email, password);
    const row = await simulateProUpgrade(supabase);

    expect(row.plan_id).toBe(BILLING_PRO_PLAN_ID);
    const usage = await getRemainingUsage(supabase);
    expect(Number(usage.limit)).toBe(500);
  });

  it('detects exceeded usage after recording events', async () => {
    await signInTestUser(supabase, email, password);
    await supabase.rpc('billing_demo_simulate_upgrade', {
      p_product_id: BILLING_PRODUCT_ID,
      p_plan_id: BILLING_FREE_PLAN_ID,
    });
    const { resetBillingUsage } = await import('../utils/billing-fixtures');
    await resetBillingUsage(supabase);
    await ensureFreeSubscription(supabase);

    for (let i = 0; i < 31; i++) {
      const { error } = await supabase.rpc('billing_record_usage_event', {
        p_product_id: BILLING_PRODUCT_ID,
        p_event_type: BILLING_USAGE_EVENT,
        p_quantity: 1,
        p_metadata: {},
      });
      expect(error).toBeNull();
    }

    const { data: exceeded, error: limitErr } = await supabase.rpc(
      'billing_has_exceeded_limit',
      {
        p_product_id: BILLING_PRODUCT_ID,
        p_event_type: BILLING_USAGE_EVENT,
      }
    );
    expect(limitErr).toBeNull();
    expect(exceeded).toBe(true);
  });

  it('blocks reading another user subscription row', async () => {
    await signInTestUser(other, otherEmail, otherPassword);
    await ensureFreeSubscription(other);

    await signInTestUser(supabase, email, password);
    const { data, error } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('user_id', otherUserId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});

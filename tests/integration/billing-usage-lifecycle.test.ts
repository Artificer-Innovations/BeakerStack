/**
 * Billing demo usage reset and demo collection RPCs.
 */

import { createWebTestClient } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  cleanupTestData,
} from '../utils/test-helpers';
import { uniqueTestEmail } from '../utils/integration-fixtures';
import {
  BILLING_PRODUCT_ID,
  BILLING_USAGE_EVENT,
  ensureFreeSubscription,
  getRemainingUsage,
  resetBillingUsage,
  simulateProUpgrade,
} from '../utils/billing-fixtures';

describe('Billing usage lifecycle integration', () => {
  const supabase = createWebTestClient();
  let userId: string;
  let email: string;
  let password: string;

  beforeAll(async () => {
    email = uniqueTestEmail();
    const u = await createTestUser(supabase, email);
    userId = u.userId;
    password = u.password;
  });

  afterAll(async () => {
    await cleanupTestData(supabase, userId, { email });
  });

  beforeEach(async () => {
    await signInTestUser(supabase, email, password);
    await ensureFreeSubscription(supabase);
    await resetBillingUsage(supabase);
  });

  it('resets usage counters via billing_demo_reset_usage', async () => {
    const { error: recordErr } = await supabase.rpc(
      'billing_record_usage_event',
      {
        p_product_id: BILLING_PRODUCT_ID,
        p_event_type: BILLING_USAGE_EVENT,
        p_quantity: 5,
        p_metadata: {},
      }
    );
    expect(recordErr).toBeNull();

    let usage = await getRemainingUsage(supabase);
    expect(Number(usage.used)).toBeGreaterThanOrEqual(5);

    await resetBillingUsage(supabase);
    usage = await getRemainingUsage(supabase);
    expect(Number(usage.used)).toBe(0);
  });

  it('manages demo collections within plan caps', async () => {
    await simulateProUpgrade(supabase);

    const { data: collectionId, error: addErr } = await supabase.rpc(
      'billing_demo_add_collection',
      { p_product_id: BILLING_PRODUCT_ID }
    );
    expect(addErr).toBeNull();
    expect(collectionId).toBeDefined();

    const { data: collections, error: listErr } = await supabase.rpc(
      'billing_demo_get_collections',
      { p_product_id: BILLING_PRODUCT_ID }
    );
    expect(listErr).toBeNull();
    expect(Array.isArray(collections)).toBe(true);
    expect((collections as unknown[]).length).toBeGreaterThanOrEqual(1);

    const { error: itemErr } = await supabase.rpc('billing_demo_add_item', {
      p_product_id: BILLING_PRODUCT_ID,
      p_collection_id: collectionId,
    });
    expect(itemErr).toBeNull();

    const { error: deleteErr } = await supabase.rpc(
      'billing_demo_delete_collection',
      {
        p_product_id: BILLING_PRODUCT_ID,
        p_collection_id: collectionId,
      }
    );
    expect(deleteErr).toBeNull();
  });

  it('reflects demo upgrade on subscription row', async () => {
    await ensureFreeSubscription(supabase);
    await simulateProUpgrade(supabase);

    const { data, error } = await supabase
      .from('billing_subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .eq('product_id', BILLING_PRODUCT_ID)
      .single();

    expect(error).toBeNull();
    expect(data?.plan_id).toBe('beakerstack_pro');
  });
});

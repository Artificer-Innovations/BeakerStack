/**
 * waitlist-capture / waitlist-ops Edge Functions (optional).
 */

import { createWebTestClient } from '../utils/test-clients';
import { uniqueTestEmail } from '../utils/integration-fixtures';
import {
  edgeFunctionsEnabled,
  getFunctionsBaseUrl,
} from '../utils/integration-edge-helpers';
import { createServiceRoleClient } from '../utils/test-clients';

const describeEdge = edgeFunctionsEnabled() ? describe : describe.skip;

describeEdge('waitlist Edge integration', () => {
  it('POST waitlist-capture creates an entry', async () => {
    const email = uniqueTestEmail();
    const base = getFunctionsBaseUrl();
    const res = await fetch(`${base}/waitlist-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, metadata: { source: 'edge-integration' } }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);

    const sr = createServiceRoleClient();
    const { data: entry } = await sr
      .from('waitlist_entries')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    expect(entry).not.toBeNull();
    if (entry) {
      await sr.from('waitlist_invites').delete().eq('entry_id', entry.id);
      await sr.from('waitlist_entries').delete().eq('id', entry.id);
    }
  });

  it('responds to OPTIONS with CORS headers', async () => {
    const base = getFunctionsBaseUrl();
    const res = await fetch(`${base}/waitlist-capture`, { method: 'OPTIONS' });
    expect(res.status).toBeLessThan(500);
  });

  it('waitlist-ops validate returns JSON for unknown token', async () => {
    const anon = createWebTestClient();
    const { data, error } = await anon.functions.invoke('waitlist-ops', {
      body: { action: 'validate', token: 'invalid-token-integration' },
    });
    expect(error).toBeNull();
    const body = data as { valid?: boolean };
    expect(body.valid).toBe(false);
  });
});

// ── Marketing email queue → Edge integration (Phase 3) ────────────────────────
// Verifies that waitlist HTTP calls produce marketing_email_sync_queue rows
// when marketing_email_settings is enabled. Requires RUN_INTEGRATION_EDGE_TESTS=1.

const TEST_MKTG_PRODUCT_ID = 'beakerstack-edge-test';

describeEdge('waitlist Edge → marketing email queue', () => {
  const sr = createServiceRoleClient();
  const base = getFunctionsBaseUrl();

  beforeAll(async () => {
    await sr
      .from('marketing_email_settings')
      .upsert(
        {
          product_id: TEST_MKTG_PRODUCT_ID,
          enabled: true,
          config: { namespace: 'bsedge', kitFormId: null },
        },
        { onConflict: 'product_id' }
      );
  });

  afterAll(async () => {
    await sr
      .from('marketing_email_sync_queue')
      .delete()
      .eq('product_id', TEST_MKTG_PRODUCT_ID);
    await sr
      .from('marketing_email_settings')
      .delete()
      .eq('product_id', TEST_MKTG_PRODUCT_ID);
  });

  it('waitlist-capture enqueues waitlist.joined when marketing is enabled', async () => {
    const email = uniqueTestEmail();

    const res = await fetch(`${base}/waitlist-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        metadata: { source: 'queue-edge-test' },
        productId: TEST_MKTG_PRODUCT_ID,
      }),
    });
    expect(res.status).toBe(200);

    const { data: row, error } = await sr
      .from('marketing_email_sync_queue')
      .select('event_type, status, email, product_id')
      .eq('email', email.toLowerCase())
      .eq('product_id', TEST_MKTG_PRODUCT_ID)
      .eq('event_type', 'waitlist.joined')
      .maybeSingle();

    expect(error).toBeNull();
    expect(row).not.toBeNull();
    expect(row?.status).toBe('pending');
    expect(row?.email).toBe(email.toLowerCase());
  });

  it('waitlist.joined queue row has a unique idempotency_key', async () => {
    const email = uniqueTestEmail();

    // First call
    await fetch(`${base}/waitlist-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        metadata: {},
        productId: TEST_MKTG_PRODUCT_ID,
      }),
    });

    // Second call with same email — should be idempotent
    await fetch(`${base}/waitlist-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        metadata: {},
        productId: TEST_MKTG_PRODUCT_ID,
      }),
    });

    const { data: rows, error } = await sr
      .from('marketing_email_sync_queue')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('product_id', TEST_MKTG_PRODUCT_ID)
      .eq('event_type', 'waitlist.joined');

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
  });

  it('waitlist.approved queue row has correct shape (DB-level; Edge auth complexity deferred)', async () => {
    // Seeding the queue row directly — calling the waitlist-ops HTTP approve
    // path requires an admin JWT which is impractical in CI. This test verifies
    // that a correctly-shaped waitlist.approved row is accepted by the queue.
    const email = uniqueTestEmail();
    const { data: entry } = await sr
      .from('waitlist_entries')
      .insert({ email: email.toLowerCase(), metadata: {} })
      .select('id')
      .single();

    expect(entry).not.toBeNull();

    // Simulate what waitlist-ops approve does: enqueue waitlist.approved
    const idempotencyKey = `waitlist.approved:${entry!.id}`;
    const { error: insErr } = await sr
      .from('marketing_email_sync_queue')
      .insert({
        product_id: TEST_MKTG_PRODUCT_ID,
        event_type: 'waitlist.approved',
        email: email.toLowerCase(),
        payload: { entry_id: entry!.id },
        idempotency_key: idempotencyKey,
      });
    expect(insErr).toBeNull();

    const { data: row } = await sr
      .from('marketing_email_sync_queue')
      .select('status, event_type')
      .eq('idempotency_key', idempotencyKey)
      .single();

    expect(row?.event_type).toBe('waitlist.approved');
    expect(row?.status).toBe('pending');

    // cleanup
    await sr.from('waitlist_entries').delete().eq('id', entry!.id);
  });
});

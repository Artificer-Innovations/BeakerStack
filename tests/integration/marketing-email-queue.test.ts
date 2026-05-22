/**
 * Integration tests for the marketing email queue (Phase 2).
 *
 * Tier 1 scope: exercises the DB layer that Edge Functions rely on —
 * marketing_email_settings lookup, queue insertion, idempotency, and the
 * waitlist_capture RPC. The full HTTP → Edge → queue path is Tier 2
 * (tests/integration/waitlist-edge.test.ts, deferred to Phase 3).
 *
 * Prerequisites: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY pointing at a
 * freshly migrated PR test DB (no pre-existing marketing_email_settings rows).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../utils/test-clients';
import { TestData } from '../utils/test-helpers';

const TEST_PRODUCT_ID = 'beakerstack';

describe('Marketing Email Queue — Integration Tests', () => {
  let admin: SupabaseClient;

  beforeAll(() => {
    admin = createServiceRoleClient();
  });

  afterAll(async () => {
    await admin
      .from('marketing_email_sync_queue')
      .delete()
      .eq('product_id', TEST_PRODUCT_ID);
    await admin
      .from('marketing_email_settings')
      .delete()
      .eq('product_id', TEST_PRODUCT_ID);
    await admin
      .from('waitlist_entries')
      .delete()
      .like('email', 'test-%@example.com');
  });

  // ── Queue table: field validation and idempotency ──────────────────────────

  describe('Queue table — direct insert behavior', () => {
    const email = TestData.email();
    const idempotencyKey = `waitlist.joined:${email}`;

    it('inserts a pending queue row with all expected fields', async () => {
      const { error } = await admin.from('marketing_email_sync_queue').insert({
        product_id: TEST_PRODUCT_ID,
        event_type: 'waitlist.joined',
        email,
        payload: { metadata: { source: 'integration-test' } },
        idempotency_key: idempotencyKey,
      });
      expect(error).toBeNull();

      const { data: row, error: readErr } = await admin
        .from('marketing_email_sync_queue')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single();

      expect(readErr).toBeNull();
      expect(row).toBeDefined();
      expect(row?.product_id).toBe(TEST_PRODUCT_ID);
      expect(row?.event_type).toBe('waitlist.joined');
      expect(row?.email).toBe(email);
      expect(row?.status).toBe('pending');
      expect(row?.attempts).toBe(0);
      expect(row?.payload).toMatchObject({
        metadata: { source: 'integration-test' },
      });
      expect(row?.idempotency_key).toBe(idempotencyKey);
    });

    it('returns a 23505 unique_violation on duplicate idempotency_key', async () => {
      const { error } = await admin.from('marketing_email_sync_queue').insert({
        product_id: TEST_PRODUCT_ID,
        event_type: 'waitlist.joined',
        email,
        payload: {},
        idempotency_key: idempotencyKey,
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe('23505');
    });

    it('ON CONFLICT DO NOTHING leaves exactly one row for the duplicate key', async () => {
      // Callers swallow 23505 by using ON CONFLICT DO NOTHING at the DB level.
      // Supabase JS doesn't expose upsert with DO NOTHING directly, so we verify
      // the single-row invariant holds after a rejected duplicate.
      const { data: rows, error } = await admin
        .from('marketing_email_sync_queue')
        .select('id')
        .eq('idempotency_key', idempotencyKey);

      expect(error).toBeNull();
      expect(rows).toHaveLength(1);
    });
  });

  // ── Settings-aware enqueue ──────────────────────────────────────────────────

  describe('Settings-aware enqueue (enabled=true)', () => {
    beforeAll(async () => {
      // Disable any competing enabled row so the partial unique index won't
      // reject our upsert. In a clean PR test DB this is a no-op.
      await admin
        .from('marketing_email_settings')
        .update({ enabled: false })
        .eq('enabled', true)
        .neq('product_id', TEST_PRODUCT_ID);

      const { error } = await admin
        .from('marketing_email_settings')
        .upsert(
          { product_id: TEST_PRODUCT_ID, enabled: true, provider: 'kit' },
          { onConflict: 'product_id' }
        );
      expect(error).toBeNull();
    });

    it('settings lookup returns enabled for the test product', async () => {
      const { data: settings, error } = await admin
        .from('marketing_email_settings')
        .select('enabled')
        .eq('product_id', TEST_PRODUCT_ID)
        .maybeSingle();

      expect(error).toBeNull();
      expect(settings?.enabled).toBe(true);
    });

    it('inserts waitlist.joined with correct product_id when enabled', async () => {
      const email = TestData.email();
      const idempotencyKey = `waitlist.joined:${email}:enabled-test`;

      const { error } = await admin.from('marketing_email_sync_queue').insert({
        product_id: TEST_PRODUCT_ID,
        event_type: 'waitlist.joined',
        email,
        payload: { metadata: { plan: 'pro' } },
        idempotency_key: idempotencyKey,
      });
      expect(error).toBeNull();

      const { data: row, error: readErr } = await admin
        .from('marketing_email_sync_queue')
        .select('product_id, event_type, email, status, payload')
        .eq('idempotency_key', idempotencyKey)
        .single();

      expect(readErr).toBeNull();
      expect(row?.product_id).toBe(TEST_PRODUCT_ID);
      expect(row?.event_type).toBe('waitlist.joined');
      expect(row?.email).toBe(email);
      expect(row?.status).toBe('pending');
      expect(row?.payload).toMatchObject({ metadata: { plan: 'pro' } });
    });

    it('metadata is passed through intact in the queue payload', async () => {
      const email = TestData.email();
      const metadata = { plan: 'enterprise', ref: 'homepage-cta', extra: 42 };

      const { error } = await admin.from('marketing_email_sync_queue').insert({
        product_id: TEST_PRODUCT_ID,
        event_type: 'waitlist.joined',
        email,
        payload: { metadata },
        idempotency_key: `waitlist.joined:${email}:metadata-test`,
      });
      expect(error).toBeNull();

      const { data: row } = await admin
        .from('marketing_email_sync_queue')
        .select('payload')
        .eq('email', email)
        .single();

      expect(row?.payload).toMatchObject({ metadata });
    });
  });

  describe('Settings-aware enqueue (enabled=false)', () => {
    beforeAll(async () => {
      const { error } = await admin
        .from('marketing_email_settings')
        .update({ enabled: false })
        .eq('product_id', TEST_PRODUCT_ID);
      expect(error).toBeNull();
    });

    afterAll(async () => {
      // Restore enabled=true so later describe blocks that depend on it still work.
      await admin
        .from('marketing_email_settings')
        .update({ enabled: true })
        .eq('product_id', TEST_PRODUCT_ID);
    });

    it('settings lookup returns disabled', async () => {
      const { data: settings, error } = await admin
        .from('marketing_email_settings')
        .select('enabled')
        .eq('product_id', TEST_PRODUCT_ID)
        .maybeSingle();

      expect(error).toBeNull();
      // enqueueMarketingEmail returns early when !settings?.enabled
      expect(settings?.enabled).toBe(false);
    });

    it('settings lookup returns null for unknown product', async () => {
      const { data: settings, error } = await admin
        .from('marketing_email_settings')
        .select('enabled')
        .eq('product_id', 'nonexistent_product')
        .maybeSingle();

      expect(error).toBeNull();
      // maybeSingle() returns null when no row matches;
      // enqueueMarketingEmail returns early: !settings?.enabled is true
      expect(settings).toBeNull();
    });
  });

  // ── waitlist_capture RPC ────────────────────────────────────────────────────

  describe('waitlist_capture RPC', () => {
    it('captures a new waitlist entry successfully', async () => {
      const email = TestData.email();
      const { data, error } = await admin.rpc('waitlist_capture', {
        p_email: email,
        p_metadata: { source: 'integration-test' },
        p_client_ip: null,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('is idempotent for duplicate email submissions', async () => {
      const email = TestData.email();

      const { error: err1 } = await admin.rpc('waitlist_capture', {
        p_email: email,
        p_metadata: {},
        p_client_ip: null,
      });
      expect(err1).toBeNull();

      // Second call with same email should not throw
      const { error: err2 } = await admin.rpc('waitlist_capture', {
        p_email: email,
        p_metadata: {},
        p_client_ip: null,
      });
      expect(err2).toBeNull();

      // Confirm only one entry
      const { data: entries } = await admin
        .from('waitlist_entries')
        .select('id')
        .eq('email', email);
      expect(entries).toHaveLength(1);
    });

    it('normalizes email to lowercase in waitlist_entries', async () => {
      const rawEmail = `TEST-UPPER-${Date.now()}@EXAMPLE.COM`;
      const normalizedEmail = rawEmail.toLowerCase();

      await admin.rpc('waitlist_capture', {
        p_email: rawEmail,
        p_metadata: {},
        p_client_ip: null,
      });

      const { data: entry, error } = await admin
        .from('waitlist_entries')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      expect(error).toBeNull();
      expect(entry?.email).toBe(normalizedEmail);
    });
  });
});

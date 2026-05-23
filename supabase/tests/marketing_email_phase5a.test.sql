-- pgTAP tests for Phase 5a: admin RPCs for marketing_email_settings.
-- Tests: admin_get_marketing_email_settings, admin_update_marketing_email_settings,
-- admin_get_marketing_email_queue_stats.
-- Pattern: BEGIN / SELECT plan(N) / assertions / SELECT * FROM finish() / ROLLBACK

BEGIN;

SELECT plan(17);

-- ── Admin user seeding ───────────────────────────────────────────────────────
-- All RPCs are admin_is_admin()-gated; seed a test admin user and set JWT claims
-- so that authenticated calls pass the gate. Pattern from admin.test.sql.

DO $$ BEGIN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
  VALUES ('a5000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
      'phase5a-admin@example.com', crypt('pw', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;
END; $$;

INSERT INTO public.admin_users (user_id)
VALUES ('a5000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL;

-- ── Test 14 pre-seed: insert phase5a-other as enabled ───────────────────────
-- Direct INSERT runs here as the postgres superuser (before SET LOCAL ROLE),
-- so it bypasses RLS. After the role switch, only SECURITY DEFINER RPCs can
-- write to marketing_email_settings.

DELETE FROM public.marketing_email_settings WHERE product_id IN ('phase5a-test', 'phase5a-other');

INSERT INTO public.marketing_email_settings (product_id, enabled, provider, config)
VALUES (
    'phase5a-other', true, 'kit',
    '{"namespace":"other-ns","kitFormId":"form-other","tierTagNames":[]}'::jsonb
);

-- ── Test 16 pre-seed: insert queue rows ─────────────────────────────────────
-- marketing_email_sync_queue also enforces RLS for the authenticated role.
-- Insert the test rows now while still running as postgres superuser.

INSERT INTO public.marketing_email_sync_queue
  (product_id, email, event_type, status, idempotency_key, payload)
VALUES
  ('phase5a-test', 'a@example.com', 'user.signed_up', 'pending',    'phase5a:pending',    '{}'::jsonb),
  ('phase5a-test', 'b@example.com', 'user.signed_up', 'processing', 'phase5a:processing', '{}'::jsonb),
  ('phase5a-test', 'c@example.com', 'user.signed_up', 'done',       'phase5a:done',       '{}'::jsonb),
  ('phase5a-test', 'd@example.com', 'user.signed_up', 'failed',     'phase5a:failed',     '{}'::jsonb)
ON CONFLICT (idempotency_key) DO NOTHING;

-- ── Switch to authenticated admin role ───────────────────────────────────────

SELECT set_config('request.jwt.claims',
    '{"sub":"a5000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- ── 1  admin_get_marketing_email_settings function exists ────────────────────

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'admin_get_marketing_email_settings'
    ),
    'admin_get_marketing_email_settings function exists'
);

-- ── 2  admin_update_marketing_email_settings function exists ─────────────────

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'admin_update_marketing_email_settings'
    ),
    'admin_update_marketing_email_settings function exists'
);

-- ── 3  admin_get_marketing_email_queue_stats function exists ─────────────────

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'admin_get_marketing_email_queue_stats'
    ),
    'admin_get_marketing_email_queue_stats function exists'
);

-- ── 4  get returns ok=true, settings=null when no row exists ─────────────────

SELECT is(
    public.admin_get_marketing_email_settings('phase5a-test'),
    jsonb_build_object('ok', true, 'settings', NULL),
    'get returns ok=true, settings=null for missing product_id'
);

-- ── 5  update rejects invalid namespace (empty) ──────────────────────────────

SELECT is(
    (public.admin_update_marketing_email_settings(
        'phase5a-test', false,
        '{"namespace":"","kitFormId":"form-99","tierTagNames":[]}'::jsonb
    )->>'error'),
    'invalid_namespace',
    'update rejects empty namespace'
);

-- ── 6  update rejects invalid namespace (bad pattern) ───────────────────────

SELECT is(
    (public.admin_update_marketing_email_settings(
        'phase5a-test', false,
        '{"namespace":"Bad Namespace","kitFormId":"form-99","tierTagNames":[]}'::jsonb
    )->>'error'),
    'invalid_namespace',
    'update rejects namespace with uppercase/spaces'
);

-- ── 7  update rejects namespace starting with digit ──────────────────────────

SELECT is(
    (public.admin_update_marketing_email_settings(
        'phase5a-test', false,
        '{"namespace":"1bad","kitFormId":"form-99","tierTagNames":[]}'::jsonb
    )->>'error'),
    'invalid_namespace',
    'update rejects namespace starting with digit'
);

-- ── 8  update rejects empty kitFormId ───────────────────────────────────────

SELECT is(
    (public.admin_update_marketing_email_settings(
        'phase5a-test', false,
        '{"namespace":"phase5a-test","kitFormId":"","tierTagNames":[]}'::jsonb
    )->>'error'),
    'invalid_kit_form_id',
    'update rejects empty kitFormId'
);

-- ── 9  update succeeds with valid inputs ─────────────────────────────────────

SELECT is(
    (public.admin_update_marketing_email_settings(
        'phase5a-test', false,
        '{"namespace":"phase5a-ns","kitFormId":"form-99","tierTagNames":["pro","max"]}'::jsonb
    )->>'error'),
    NULL,
    'update succeeds with valid namespace and kitFormId'
);

-- ── 10  get now returns the row just upserted ────────────────────────────────

SELECT is(
    (public.admin_get_marketing_email_settings('phase5a-test')->'settings'->>'product_id'),
    'phase5a-test',
    'get returns correct product_id after upsert'
);

-- ── 11  settings contain namespace ───────────────────────────────────────────

SELECT is(
    (public.admin_get_marketing_email_settings('phase5a-test')
        ->'settings'->'config'->>'namespace'),
    'phase5a-ns',
    'settings config contains correct namespace'
);

-- ── 12  settings contain kitFormId ───────────────────────────────────────────

SELECT is(
    (public.admin_get_marketing_email_settings('phase5a-test')
        ->'settings'->'config'->>'kitFormId'),
    'form-99',
    'settings config contains correct kitFormId'
);

-- ── 13  settings contain tierTagNames ────────────────────────────────────────

SELECT is(
    (public.admin_get_marketing_email_settings('phase5a-test')
        ->'settings'->'config'->'tierTagNames'),
    '["pro","max"]'::jsonb,
    'settings config contains correct tierTagNames'
);

-- ── 14  one-enabled: enabling phase5a-test disables other enabled rows ────────
-- phase5a-other was pre-seeded as enabled (as postgres superuser, above).
-- Call the admin RPC to enable phase5a-test, which must flip phase5a-other off.

SELECT public.admin_update_marketing_email_settings(
    'phase5a-test', true,
    '{"namespace":"phase5a-ns","kitFormId":"form-99","tierTagNames":["pro"]}'::jsonb
);

SELECT is(
    (SELECT enabled FROM public.marketing_email_settings WHERE product_id = 'phase5a-other'),
    false,
    'enabling one product disables all other enabled rows (one-enabled constraint)'
);

-- ── 15  audit row written for update ─────────────────────────────────────────

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.admin_audit_log
        WHERE action = 'admin.marketing_email.settings.update'
          AND target_type = 'marketing_email_settings'
          AND target_id = 'phase5a-test'
    ),
    'update writes an audit row'
);

-- ── 16  queue stats counts match inserted rows by status ─────────────────────
-- Rows were pre-seeded as postgres superuser above to bypass RLS.

SELECT is(
    (SELECT jsonb_build_object(
        'pending',    COUNT(*) FILTER (WHERE status = 'pending'),
        'processing', COUNT(*) FILTER (WHERE status = 'processing'),
        'done',       COUNT(*) FILTER (WHERE status = 'done'),
        'failed',     COUNT(*) FILTER (WHERE status = 'failed')
    )
    FROM public.marketing_email_sync_queue
    WHERE product_id = 'phase5a-test'),
    '{"done": 1, "failed": 1, "pending": 1, "processing": 1}'::jsonb,
    'queue stats counts match inserted rows by status'
);

-- ── 17  queue_stats function returns a jsonb with all four status keys ────────

SELECT ok(
    (
        SELECT result ? 'pending' AND result ? 'processing' AND result ? 'done' AND result ? 'failed'
        FROM (SELECT public.admin_get_marketing_email_queue_stats() AS result) sub
    ),
    'admin_get_marketing_email_queue_stats returns jsonb with pending/processing/done/failed keys'
);

SELECT * FROM finish();
ROLLBACK;

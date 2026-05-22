-- pgTAP tests for Phase 4: user.deleted CHECK constraint, AFTER DELETE trigger,
-- and kit_webhook_check_rate_limit RPC.
-- Pattern: BEGIN / SELECT plan(N) / assertions / SELECT * FROM finish() / ROLLBACK

BEGIN;

SELECT plan(14);

-- ── 1  user.deleted accepted by event_type CHECK ────────────────────────────

SELECT ok(
    (
        SELECT count(*)::int = 0
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'marketing_email_sync_queue'
          AND c.contype = 'c'
          AND c.conname = 'marketing_email_sync_queue_event_type_check'
          AND pg_get_constraintdef(c.oid) NOT LIKE '%user.deleted%'
    ),
    'event_type CHECK includes user.deleted'
);

-- ── 2  AFTER DELETE trigger exists on auth.users ────────────────────────────

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth'
          AND c.relname = 'users'
          AND t.tgname = 'marketing_email_on_user_deleted'
    ),
    'AFTER DELETE trigger exists on auth.users'
);

-- ── 3  kit_webhook_check_rate_limit function exists ─────────────────────────

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'kit_webhook_check_rate_limit'
    ),
    'kit_webhook_check_rate_limit function exists'
);

-- ── Test fixtures ────────────────────────────────────────────────────────────

-- Enable marketing email for one product so trigger fires.
INSERT INTO public.marketing_email_settings
  (product_id, enabled, provider, config)
VALUES
  ('beakerstack', true, 'kit', '{"namespace":"bstack-test","form_id":"form-1"}')
ON CONFLICT (product_id) DO UPDATE
  SET enabled = true, provider = 'kit', config = '{"namespace":"bstack-test","form_id":"form-1"}'::jsonb;

-- Test user to delete.
DO $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
    'b2000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'deleted-user@example.com',
    crypt('pw', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ── 4  DELETE trigger enqueues user.deleted ──────────────────────────────────

DELETE FROM auth.users WHERE id = 'b2000000-0000-0000-0000-000000000001';

SELECT is(
    (SELECT event_type FROM public.marketing_email_sync_queue
     WHERE idempotency_key = 'user.deleted:b2000000-0000-0000-0000-000000000001'),
    'user.deleted',
    'DELETE trigger enqueues user.deleted row'
);

-- ── 5  enqueued email is normalized (lowercase/trimmed) ─────────────────────

SELECT is(
    (SELECT email FROM public.marketing_email_sync_queue
     WHERE idempotency_key = 'user.deleted:b2000000-0000-0000-0000-000000000001'),
    'deleted-user@example.com',
    'enqueued email is lowercase/trimmed'
);

-- ── 6  enqueued status is pending ───────────────────────────────────────────

SELECT is(
    (SELECT status FROM public.marketing_email_sync_queue
     WHERE idempotency_key = 'user.deleted:b2000000-0000-0000-0000-000000000001'),
    'pending',
    'enqueued user.deleted row has status=pending'
);

-- ── 7  Idempotent: second delete does not produce a second queue row ─────────
-- (auth.users row is already deleted; simulate by inserting then deleting again)

DO $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
    'b2000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'deleted-user@example.com',
    crypt('pw', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

DELETE FROM auth.users WHERE id = 'b2000000-0000-0000-0000-000000000001';

SELECT is(
    (SELECT count(*)::int FROM public.marketing_email_sync_queue
     WHERE idempotency_key = 'user.deleted:b2000000-0000-0000-0000-000000000001'),
    1,
    'duplicate DELETE does not produce second queue row (idempotent)'
);

-- ── 8  NULL email user: trigger is a no-op ──────────────────────────────────

DO $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
    'b2000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    NULL,
    crypt('pw', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

DELETE FROM auth.users WHERE id = 'b2000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT count(*)::int FROM public.marketing_email_sync_queue
     WHERE idempotency_key = 'user.deleted:b2000000-0000-0000-0000-000000000002'),
    0,
    'NULL email user: trigger does not enqueue'
);

-- ── 9  Trigger is a no-op when marketing email is disabled ──────────────────

UPDATE public.marketing_email_settings
  SET enabled = false WHERE product_id = 'beakerstack';

DO $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
    'b2000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'disabled-product-user@example.com',
    crypt('pw', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

DELETE FROM auth.users WHERE id = 'b2000000-0000-0000-0000-000000000003';

SELECT is(
    (SELECT count(*)::int FROM public.marketing_email_sync_queue
     WHERE idempotency_key = 'user.deleted:b2000000-0000-0000-0000-000000000003'),
    0,
    'trigger is a no-op when marketing email is disabled'
);

-- Re-enable for remaining tests.
UPDATE public.marketing_email_settings
  SET enabled = true WHERE product_id = 'beakerstack';

-- ── 10-12  kit_webhook_check_rate_limit behavior ────────────────────────────

-- First call: within limit → true.
SELECT is(
    public.kit_webhook_check_rate_limit('kit-webhook-test:1.2.3.4', now(), 5),
    true,
    'rate limit: first request is within limit'
);

-- Burn 4 more (total 5 = at limit).
SELECT public.kit_webhook_check_rate_limit('kit-webhook-test:1.2.3.4', now(), 5);
SELECT public.kit_webhook_check_rate_limit('kit-webhook-test:1.2.3.4', now(), 5);
SELECT public.kit_webhook_check_rate_limit('kit-webhook-test:1.2.3.4', now(), 5);
SELECT public.kit_webhook_check_rate_limit('kit-webhook-test:1.2.3.4', now(), 5);

-- 6th call: exceeds limit → false.
SELECT is(
    public.kit_webhook_check_rate_limit('kit-webhook-test:1.2.3.4', now(), 5),
    false,
    'rate limit: 6th request exceeds limit of 5'
);

-- Different IP is independent.
SELECT is(
    public.kit_webhook_check_rate_limit('kit-webhook-test:9.9.9.9', now(), 5),
    true,
    'rate limit: different IP has its own independent bucket'
);

-- ── 13  user.deleted in queue payload contains user_id ──────────────────────

-- Re-insert and delete a fresh user to check payload.
DO $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
    'b2000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'payload-check@example.com',
    crypt('pw', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

DELETE FROM auth.users WHERE id = 'b2000000-0000-0000-0000-000000000004';

SELECT is(
    (SELECT (payload->>'user_id')::uuid FROM public.marketing_email_sync_queue
     WHERE idempotency_key = 'user.deleted:b2000000-0000-0000-0000-000000000004'),
    'b2000000-0000-0000-0000-000000000004'::uuid,
    'user.deleted queue payload includes user_id'
);

-- ── 14  kit_webhook_check_rate_limit uses hour-truncated window ──────────────

-- Calls in the same hour window should accumulate into one bucket row.
SELECT is(
    (SELECT count(*)::int FROM public.waitlist_rate_limits
     WHERE bucket_key = 'kit-webhook-test:1.2.3.4'
       AND window_start = date_trunc('hour', now())),
    1,
    'rate limit uses hour-truncated window (one bucket row per IP per hour)'
);

SELECT * FROM finish();
ROLLBACK;

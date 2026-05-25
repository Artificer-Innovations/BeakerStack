-- pgTAP tests for Phase 2 marketing email schema and trigger.
-- Covers: table existence, RLS, CHECK constraints, trigger behavior, idempotency.
-- Pattern: BEGIN / SELECT plan(N) / assertions / SELECT * FROM finish() / ROLLBACK

BEGIN;

SELECT plan(25);

-- ── 1-3  Table existence ────────────────────────────────────────────────────

SELECT has_table(
    'public', 'marketing_email_settings',
    'marketing_email_settings table exists'
);

SELECT has_table(
    'public', 'marketing_email_sync_queue',
    'marketing_email_sync_queue table exists'
);

SELECT has_table(
    'public', 'marketing_email_unsubscribes',
    'marketing_email_unsubscribes table exists'
);

-- ── 4-6  RLS enabled ────────────────────────────────────────────────────────

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'marketing_email_settings'
          AND c.relrowsecurity = true
    ),
    'RLS enabled on marketing_email_settings'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'marketing_email_sync_queue'
          AND c.relrowsecurity = true
    ),
    'RLS enabled on marketing_email_sync_queue'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'marketing_email_unsubscribes'
          AND c.relrowsecurity = true
    ),
    'RLS enabled on marketing_email_unsubscribes'
);

-- ── 7-9  No user-facing RLS policies (all three tables are service-role only) ─

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'marketing_email_settings'
    ),
    'No RLS policies on marketing_email_settings — service-role access only'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'marketing_email_sync_queue'
    ),
    'No RLS policies on marketing_email_sync_queue — service-role access only'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'marketing_email_unsubscribes'
    ),
    'No RLS policies on marketing_email_unsubscribes — service-role access only'
);

-- ── 10-12  CHECK constraints ─────────────────────────────────────────────────

SELECT throws_ok(
    $throws$
        INSERT INTO public.marketing_email_sync_queue
            (product_id, event_type, email, idempotency_key)
        VALUES ('chk', 'bad_event_type', 'a@b.com', 'chk-event-1')
    $throws$,
    '23514', NULL,
    'event_type CHECK rejects values outside LifecycleEventType'
);

SELECT throws_ok(
    $throws$
        INSERT INTO public.marketing_email_sync_queue
            (product_id, event_type, email, idempotency_key, status)
        VALUES ('chk', 'user.signed_up', 'a@b.com', 'chk-status-1', 'bad_status')
    $throws$,
    '23514', NULL,
    'status CHECK rejects invalid status values'
);

SELECT throws_ok(
    $throws$
        INSERT INTO public.marketing_email_settings (product_id, provider)
        VALUES ('chk_provider', 'mailchimp')
    $throws$,
    '23514', NULL,
    'provider CHECK rejects values other than ''kit'''
);

-- ── 13-14  NOT NULL constraints ──────────────────────────────────────────────

SELECT throws_ok(
    $throws$
        INSERT INTO public.marketing_email_sync_queue
            (product_id, event_type, email, idempotency_key)
        VALUES ('chk', 'user.signed_up', 'a@b.com', NULL)
    $throws$,
    '23502', NULL,
    'idempotency_key NOT NULL enforced on marketing_email_sync_queue'
);

SELECT throws_ok(
    $throws$
        INSERT INTO public.marketing_email_unsubscribes (product_id, email)
        VALUES (NULL, 'a@b.com')
    $throws$,
    '23502', NULL,
    'marketing_email_unsubscribes.product_id NOT NULL enforced'
);

-- ── 15-16  Trigger function and trigger existence ────────────────────────────

SELECT has_function(
    'public',
    '_marketing_email_on_user_signed_up',
    'trigger function _marketing_email_on_user_signed_up exists in public schema'
);

SELECT has_trigger(
    'auth',
    'users',
    'marketing_email_user_signed_up',
    'trigger marketing_email_user_signed_up exists on auth.users'
);

-- ── 17  PUBLIC execute revoked ───────────────────────────────────────────────
-- REVOKE ALL FROM PUBLIC sets proacl to a non-null ACL on pg_proc.
-- A null proacl means default privileges apply (PUBLIC can execute),
-- so non-null confirms the revoke ran.

SELECT ok(
    (
        SELECT p.proacl IS NOT NULL
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = '_marketing_email_on_user_signed_up'
    ),
    'REVOKE ALL FROM PUBLIC sets non-null proacl on _marketing_email_on_user_signed_up'
);

-- ── 18  No enabled settings → auth insert → no queue row ────────────────────
-- At this point no marketing_email_settings rows exist in this transaction,
-- so the trigger's SELECT INTO finds nothing and returns early.

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
) VALUES (
    '00000000-0000-4444-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'nosettings@example.com',
    crypt('x', gen_salt('bf')),
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(),
    'authenticated', 'authenticated'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM public.marketing_email_sync_queue
        WHERE email = 'nosettings@example.com'
    ),
    'No enabled settings: auth.users INSERT does not produce a queue row'
);

-- ── Setup: enable marketing email for trigger behavior tests ─────────────────

INSERT INTO public.marketing_email_settings (product_id, enabled, provider)
VALUES ('trigger_test_product', true, 'kit');

-- ── 19  Partial unique index: second enabled=true must fail ──────────────────

SELECT throws_ok(
    $throws$
        INSERT INTO public.marketing_email_settings (product_id, enabled, provider)
        VALUES ('trigger_test_product_2', true, 'kit')
    $throws$,
    '23505', NULL,
    'Partial unique index prevents more than one marketing_email_settings row with enabled = true'
);

-- ── 20-24  Trigger: enabled=true → queue row with correct fields ─────────────
-- Insert with mixed-case email to verify lower(trim()) normalization.

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
) VALUES (
    '00000000-0000-4444-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    '  TRIGGERED@Example.com  ',
    crypt('x', gen_salt('bf')),
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(),
    'authenticated', 'authenticated'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.marketing_email_sync_queue
        WHERE idempotency_key = 'user.signed_up:00000000-0000-4444-0000-000000000002'
    ),
    'enabled=true: auth.users INSERT enqueues a user.signed_up row'
);

SELECT is(
    (
        SELECT product_id FROM public.marketing_email_sync_queue
        WHERE idempotency_key = 'user.signed_up:00000000-0000-4444-0000-000000000002'
    ),
    'trigger_test_product',
    'Queue row product_id matches the enabled marketing_email_settings row'
);

SELECT is(
    (
        SELECT email FROM public.marketing_email_sync_queue
        WHERE idempotency_key = 'user.signed_up:00000000-0000-4444-0000-000000000002'
    ),
    'triggered@example.com',
    'Queue row email is lower(trim(NEW.email)) — normalized regardless of input casing'
);

SELECT is(
    (
        SELECT event_type FROM public.marketing_email_sync_queue
        WHERE idempotency_key = 'user.signed_up:00000000-0000-4444-0000-000000000002'
    ),
    'user.signed_up',
    'Queue row event_type is user.signed_up'
);

-- ── 24  Idempotency: ON CONFLICT DO NOTHING on duplicate key ─────────────────

INSERT INTO public.marketing_email_sync_queue
    (product_id, event_type, email, idempotency_key)
VALUES
    ('trigger_test_product', 'user.signed_up',
     'triggered@example.com',
     'user.signed_up:00000000-0000-4444-0000-000000000002')
ON CONFLICT (idempotency_key) DO NOTHING;

SELECT ok(
    (
        SELECT count(*) = 1 FROM public.marketing_email_sync_queue
        WHERE idempotency_key = 'user.signed_up:00000000-0000-4444-0000-000000000002'
    ),
    'ON CONFLICT DO NOTHING: duplicate idempotency_key leaves exactly one row'
);

-- ── 25  Null email → trigger returns early without enqueueing ────────────────

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
) VALUES (
    '00000000-0000-4444-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    NULL,
    crypt('x', gen_salt('bf')),
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(),
    'authenticated', 'authenticated'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM public.marketing_email_sync_queue
        WHERE idempotency_key = 'user.signed_up:00000000-0000-4444-0000-000000000003'
    ),
    'Null email: trigger returns early without inserting a queue row'
);

SELECT * FROM finish();

ROLLBACK;

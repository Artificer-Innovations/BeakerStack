BEGIN;

SELECT plan(8);

-- 1. pg_cron extension exists
SELECT has_extension('pg_cron', 'pg_cron extension is installed');

-- 2. pg_net extension exists
SELECT has_extension('pg_net', 'pg_net extension is installed');

-- 3. kit_sync_dequeue function exists
SELECT has_function(
  'public',
  'kit_sync_dequeue',
  ARRAY['integer'],
  'kit_sync_dequeue(int) exists'
);

-- 4. kit_sync_dequeue is SECURITY INVOKER (not definer — runs as caller)
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'kit_sync_dequeue'
      AND p.prosecdef = true
  ),
  'kit_sync_dequeue is SECURITY INVOKER'
);

-- 5. kit_sync_setup_cron function exists
SELECT has_function(
  'public',
  'kit_sync_setup_cron',
  ARRAY['text', 'text'],
  'kit_sync_setup_cron(text, text) exists'
);

-- 6. kit_sync_setup_cron is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'kit_sync_setup_cron'
      AND p.prosecdef = true
  ),
  'kit_sync_setup_cron is SECURITY DEFINER'
);

-- 7. kit_sync_setup_cron has no PUBLIC execute grant in proacl
-- (has_function_privilege('PUBLIC',...) fails — PUBLIC is a pseudo-role, not a real role name.
-- Instead we verify proacl is explicitly set (revoke applied) and has no =X/ entry for PUBLIC.)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'kit_sync_setup_cron'
      AND p.proacl IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM unnest(p.proacl) a
        WHERE a::text ~ '^=X/'
      )
  ),
  'kit_sync_setup_cron has no PUBLIC execute grant'
);

-- 8. kit_sync_dequeue marks rows as processing and returns them
-- kit_sync_dequeue operates on the queue directly — no settings lookup needed.
INSERT INTO public.marketing_email_sync_queue
  (product_id, event_type, email, payload, idempotency_key, status)
VALUES
  ('__cron_test__', 'user.signed_up', 'cron-test@example.com',
   '{"user_id":"00000000-0000-0000-0000-000000000001"}',
   'cron-test:signed_up:1', 'pending');

SELECT ok(
  (SELECT COUNT(*) FROM public.kit_sync_dequeue(5)
   WHERE email = 'cron-test@example.com' AND status = 'processing')::int = 1,
  'kit_sync_dequeue returns pending row as processing'
);

SELECT * FROM finish();

ROLLBACK;

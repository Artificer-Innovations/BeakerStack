BEGIN;

SELECT plan(17);

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

-- 7. kit_sync_setup_cron has no PUBLIC execute grant
-- proacl IS NOT NULL means REVOKE FROM PUBLIC was applied (overrides default).
SELECT ok(
  (SELECT p.proacl IS NOT NULL
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'kit_sync_setup_cron'),
  'kit_sync_setup_cron has no PUBLIC execute grant (REVOKE applied)'
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

-- 9. kit_sync_runtime_config table exists
SELECT has_table('public', 'kit_sync_runtime_config', 'kit_sync_runtime_config table exists');

-- 10. RLS is enabled on kit_sync_runtime_config
SELECT ok(
  (SELECT c.relrowsecurity
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'kit_sync_runtime_config'),
  'kit_sync_runtime_config has RLS enabled'
);

-- 11. anon role has no SELECT on kit_sync_runtime_config
SELECT ok(
  NOT has_table_privilege('anon', 'public.kit_sync_runtime_config', 'SELECT'),
  'anon has no SELECT on kit_sync_runtime_config'
);

-- 12. authenticated role has no SELECT on kit_sync_runtime_config
-- Supabase default privileges grant both anon and authenticated; test both.
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.kit_sync_runtime_config', 'SELECT'),
  'authenticated has no SELECT on kit_sync_runtime_config'
);

-- 13. kit_sync_setup_cron executes without error and upserts config row
SELECT lives_ok(
  $$ SELECT kit_sync_setup_cron('https://test.supabase.co/functions/v1/kit-sync', 'test-secret-abc') $$,
  'kit_sync_setup_cron executes without error'
);

-- 14. config row contains the expected worker_url and cron_secret
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.kit_sync_runtime_config
    WHERE singleton = true
      AND worker_url  = 'https://test.supabase.co/functions/v1/kit-sync'
      AND cron_secret = 'test-secret-abc'
  ),
  'kit_sync_runtime_config row has correct worker_url and cron_secret after setup'
);

-- 15. cron.job row exists for kit-sync-worker
SELECT ok(
  EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'kit-sync-worker'),
  'kit-sync-worker cron job row exists after setup'
);

-- 16. cron.job.command for kit-sync-worker does not contain the literal secret
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'kit-sync-worker'
      AND command LIKE '%test-secret-abc%'
  ),
  'kit-sync-worker cron command does not inline the bearer secret'
);

-- 17. service_role has no SELECT on kit_sync_runtime_config via table grant
-- The SECURITY DEFINER function accesses the table as owner; no grant needed.
SELECT ok(
  NOT has_table_privilege('service_role', 'public.kit_sync_runtime_config', 'SELECT'),
  'service_role has no direct SELECT on kit_sync_runtime_config'
);

-- Cleanup: unschedule the test cron job to avoid leaving stale rows in
-- cron.job on non-ephemeral databases (pg_cron commits independently of
-- the outer pgTAP transaction).
PERFORM cron.unschedule('kit-sync-worker');

SELECT * FROM finish();

ROLLBACK;

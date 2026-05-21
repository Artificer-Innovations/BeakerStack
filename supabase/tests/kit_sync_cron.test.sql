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

-- 7. kit_sync_setup_cron is not callable by PUBLIC
SELECT ok(
  NOT has_function_privilege('PUBLIC', 'public.kit_sync_setup_cron(text, text)', 'EXECUTE'),
  'kit_sync_setup_cron is not PUBLIC-executable'
);

-- 8. kit_sync_dequeue marks rows as processing and returns them
DO $$
BEGIN
  -- Ensure a product + settings row exists for this test
  INSERT INTO public.marketing_email_settings (product_id, enabled, config)
  VALUES ('__test__', true, '{"namespace":"test"}')
  ON CONFLICT (product_id) DO NOTHING;
END;
$$;

INSERT INTO public.marketing_email_sync_queue
  (product_id, event_type, email, payload, idempotency_key, status)
VALUES
  ('__test__', 'user.signed_up', 'cron-test@example.com',
   '{"user_id":"00000000-0000-0000-0000-000000000001"}',
   'cron-test:signed_up:1', 'pending');

SELECT ok(
  (SELECT COUNT(*) FROM public.kit_sync_dequeue(5)
   WHERE email = 'cron-test@example.com' AND status = 'processing') = 1,
  'kit_sync_dequeue returns pending row as processing'
);

SELECT * FROM finish();

ROLLBACK;

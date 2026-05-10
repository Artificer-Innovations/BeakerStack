-- pgTAP: billing tables and RLS presence
BEGIN;
SELECT plan(9);

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'billing_subscriptions' AND c.relrowsecurity = true
    ),
    'RLS enabled on billing_subscriptions'
);

SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_subscriptions' AND policyname = 'billing_subscriptions_select_own'),
    'billing_subscriptions select policy exists'
);

SELECT ok(
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'ensure_billing_subscription'),
    'ensure_billing_subscription exists'
);

SELECT ok(
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'billing_record_usage_event'),
    'billing_record_usage_event exists'
);

SELECT ok(
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'billing_get_remaining_usage'),
    'billing_get_remaining_usage exists'
);

SELECT ok(
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'billing_demo_simulate_upgrade'),
    'billing_demo_simulate_upgrade exists'
);

SELECT ok(
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'billing_demo_delete_collection'),
    'billing_demo_delete_collection exists'
);

SELECT ok(
    EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'billing_subscriptions'),
    'billing_subscriptions in supabase_realtime publication'
);

SELECT ok(
    EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'billing_usage_aggregates'),
    'billing_usage_aggregates in supabase_realtime publication'
);

SELECT * FROM finish();
ROLLBACK;

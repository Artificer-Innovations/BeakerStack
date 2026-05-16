-- pgTAP: billing_record_usage_event idempotency deduplication regression
-- Asserts that supplying the same p_idempotency_key twice results in exactly one
-- row in billing_usage_events and one increment to the usage aggregate.
-- Also asserts that NULL idempotency keys are never deduplicated.
BEGIN;
SELECT plan(5);

-- ── Test setup ─────────────────────────────────────────────────────────────
-- Use a fixed UUID as the test user so cleanup is predictable.
DO $$
BEGIN
  INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'idempotency-test@example.com',
      crypt('pw', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Insert a minimal free-tier subscription using only NOT NULL columns without
-- defaults, so this INSERT stays valid across future nullable column additions.
INSERT INTO public.billing_subscriptions (
    id, user_id, product_id, plan_id, status
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'beakerstack',
    'beakerstack_free',
    'free'
) ON CONFLICT (id) DO NOTHING;

-- Simulate an authenticated session for auth.uid().
SELECT set_config('request.jwt.claims',
    '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true);
SET LOCAL ROLE authenticated;

-- ── Scenario 1: identical idempotency key is deduplicated ──────────────────
-- Use quantity=3 so the aggregate assertion distinguishes a successful dedup
-- (count=3) from accidental overwrite (still 3) vs no dedup (would be 6).
SELECT public.billing_record_usage_event(
    'beakerstack', 'ai_summarize', 3, '{}'::jsonb,
    '30000000-0000-0000-0000-000000000001'
);
SELECT public.billing_record_usage_event(
    'beakerstack', 'ai_summarize', 3, '{}'::jsonb,
    '30000000-0000-0000-0000-000000000001'
);

-- Reset to the test-runner role (typically postgres), which bypasses RLS.
RESET ROLE;

SELECT is(
    (SELECT count(*)::int
     FROM public.billing_usage_events
     WHERE idempotency_key = '30000000-0000-0000-0000-000000000001'),
    1,
    'duplicate idempotency key produces exactly one event row'
);

SELECT is(
    (SELECT count::int
     FROM public.billing_usage_aggregates
     WHERE user_id = '10000000-0000-0000-0000-000000000001'
       AND product_id = 'beakerstack'
       AND event_type = 'ai_summarize'),
    3,
    'aggregate count is 3 (not 6) after duplicate call — confirms count+excluded.count path'
);

-- ── Scenario 2: NULL idempotency key is never deduplicated ────────────────
-- The partial unique index only covers non-null keys; two null-key calls must
-- each produce their own event row (quantity=1 each, adds 2 to aggregate).
SET LOCAL ROLE authenticated;
SELECT public.billing_record_usage_event(
    'beakerstack', 'ai_summarize', 1, '{}'::jsonb, NULL
);
SELECT public.billing_record_usage_event(
    'beakerstack', 'ai_summarize', 1, '{}'::jsonb, NULL
);

-- Reset to the test-runner role (typically postgres), which bypasses RLS.
RESET ROLE;

SELECT is(
    (SELECT count(*)::int
     FROM public.billing_usage_events
     WHERE user_id = '10000000-0000-0000-0000-000000000001'
       AND event_type = 'ai_summarize'
       AND idempotency_key IS NULL),
    2,
    'two calls with NULL idempotency key both produce distinct event rows'
);

-- ── Combined assertions ────────────────────────────────────────────────────
SELECT is(
    (SELECT count(*)::int
     FROM public.billing_usage_events
     WHERE user_id = '10000000-0000-0000-0000-000000000001'
       AND event_type = 'ai_summarize'),
    3,
    'total event rows for test user: 1 keyed + 2 null-key'
);

SELECT is(
    (SELECT count::int
     FROM public.billing_usage_aggregates
     WHERE user_id = '10000000-0000-0000-0000-000000000001'
       AND product_id = 'beakerstack'
       AND event_type = 'ai_summarize'),
    5,
    'aggregate count is 5 (3 from keyed dedup + 1 + 1 from null-key calls)'
);

SELECT * FROM finish();
ROLLBACK;

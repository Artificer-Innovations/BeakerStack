-- pgTAP: billing_record_usage_event idempotency deduplication regression
-- Asserts that supplying the same p_idempotency_key twice results in exactly one
-- row in billing_usage_events and one increment to the usage aggregate.
BEGIN;
SELECT plan(4);

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

-- Insert a free-tier subscription so the function does not need to create one.
INSERT INTO public.billing_subscriptions (
    id, user_id, product_id, plan_id, status,
    stripe_customer_id, stripe_subscription_id, stripe_price_id,
    current_period_start, current_period_end,
    cancel_at_period_end, canceled_at, trial_start, trial_end
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'beakerstack',
    'beakerstack_free',
    'free',
    NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL
) ON CONFLICT DO NOTHING;

-- Simulate an authenticated session for auth.uid().
SELECT set_config('request.jwt.claims',
    '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true);
SET LOCAL ROLE authenticated;

-- ── Call the RPC twice with the same idempotency key ───────────────────────
SELECT public.billing_record_usage_event(
    'beakerstack', 'ai_summarize', 1, '{}'::jsonb,
    '30000000-0000-0000-0000-000000000001'
);
SELECT public.billing_record_usage_event(
    'beakerstack', 'ai_summarize', 1, '{}'::jsonb,
    '30000000-0000-0000-0000-000000000001'
);

-- ── Assertions ─────────────────────────────────────────────────────────────
-- Drop back to superuser to read the tables (RLS would otherwise block us).
RESET ROLE;

SELECT is(
    (SELECT count(*)::int
     FROM public.billing_usage_events
     WHERE idempotency_key = '30000000-0000-0000-0000-000000000001'),
    1,
    'duplicate idempotency key produces exactly one event row'
);

SELECT is(
    (SELECT count(*)::int
     FROM public.billing_usage_events
     WHERE user_id = '10000000-0000-0000-0000-000000000001'
       AND event_type = 'ai_summarize'),
    1,
    'only one ai_summarize event row exists for the test user'
);

SELECT is(
    (SELECT count::int
     FROM public.billing_usage_aggregates
     WHERE user_id = '10000000-0000-0000-0000-000000000001'
       AND product_id = 'beakerstack'
       AND event_type = 'ai_summarize'),
    1,
    'aggregate count is 1 (not 2) after duplicate call'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM public.billing_usage_events
        WHERE user_id = '10000000-0000-0000-0000-000000000001'
          AND event_type = 'ai_summarize'
          AND idempotency_key IS NULL
    ),
    'no null-key duplicate row was inserted alongside the keyed row'
);

SELECT * FROM finish();
ROLLBACK;

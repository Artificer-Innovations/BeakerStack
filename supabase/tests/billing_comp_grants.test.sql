-- pgTAP: complimentary billing grants — schema, RPC access, grant/revoke flows
BEGIN;
SELECT plan(26);

-- ── Schema / security ────────────────────────────────────────────────────────
SELECT has_table('public', 'billing_comp_grants', 'billing_comp_grants table exists');

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'billing_comp_grants' AND c.relrowsecurity = true
    ),
    'RLS enabled on billing_comp_grants'
);

SELECT is(
    (SELECT count(*)::int FROM pg_policies WHERE tablename = 'billing_comp_grants'),
    0,
    'billing_comp_grants has no RLS policies for client roles'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'admin_grant_billing_comp'
    ),
    'admin_grant_billing_comp exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'admin_revoke_billing_comp'
    ),
    'admin_revoke_billing_comp exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'billing_comp_grants_active_user_product'
    ),
    'partial unique index on active comp grants exists'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM public.billing_plans p
        WHERE p.product_id = 'beakerstack'
          AND p.billing_period = 'free'
          AND p.is_public = false
    ),
    'beakerstack free-tier selector guard: no hidden plans use billing_period free'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.billing_plans
        WHERE id = 'beakerstack_vip' AND product_id = 'beakerstack' AND is_public = false
    ),
    'beakerstack_vip hidden plan exists in billing_plans'
);

SELECT ok(
    (SELECT (features ->> 'feature_b')::boolean FROM public.billing_plans WHERE id = 'beakerstack_vip'),
    'beakerstack_vip includes Max-equivalent feature_b'
);

SELECT is(
    (SELECT (usage_limits ->> 'ai_summarize')::int FROM public.billing_plans WHERE id = 'beakerstack_vip'),
    -1,
    'beakerstack_vip includes unlimited ai_summarize meter'
);

-- ── Fixtures ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
      'c1000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'comp-test-user@example.com',
      crypt('pw', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
      'c1000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'comp-test-admin@example.com',
      crypt('pw', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

INSERT INTO public.admin_users (user_id)
VALUES ('c1000000-0000-0000-0000-000000000002')
ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL;

DELETE FROM public.billing_comp_grants
WHERE user_id = 'c1000000-0000-0000-0000-000000000001';

DELETE FROM public.billing_subscriptions
WHERE user_id = 'c1000000-0000-0000-0000-000000000001' AND product_id = 'beakerstack';

-- ── Non-admin denied ─────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
    '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true);
SET LOCAL ROLE authenticated;

SELECT is(
    public.admin_grant_billing_comp(
        'c1000000-0000-0000-0000-000000000001'::uuid,
        'beakerstack', 'beakerstack_vip', 'test'
    ) ->> 'error',
    'not_found',
    'non-admin admin_grant_billing_comp returns not_found'
);

SELECT is(
    public.admin_revoke_billing_comp(
        'c1000000-0000-0000-0000-000000000001'::uuid,
        'beakerstack'
    ) ->> 'error',
    'not_found',
    'non-admin admin_revoke_billing_comp returns not_found'
);

-- ── Admin grant / revoke happy path ───────────────────────────────────────────
SELECT set_config('request.jwt.claims',
    '{"sub":"c1000000-0000-0000-0000-000000000002","role":"authenticated"}',
    true);
SET LOCAL ROLE authenticated;

SELECT is(
    public.admin_grant_billing_comp(
        'c1000000-0000-0000-0000-000000000001'::uuid,
        'beakerstack', 'beakerstack_vip', 'design partner'
    ) ->> 'ok',
    'true',
    'admin grant comp returns ok'
);

RESET ROLE;

SELECT is(
    (
        SELECT s.status
        FROM public.billing_subscriptions s
        WHERE s.user_id = 'c1000000-0000-0000-0000-000000000001'
          AND s.product_id = 'beakerstack'
    ),
    'comped',
    'grant sets subscription status to comped'
);

SELECT is(
    (
        SELECT s.plan_id
        FROM public.billing_subscriptions s
        WHERE s.user_id = 'c1000000-0000-0000-0000-000000000001'
          AND s.product_id = 'beakerstack'
    ),
    'beakerstack_vip',
    'grant sets subscription plan_id to beakerstack_vip'
);

SELECT is(
    (
        SELECT count(*)::int
        FROM public.billing_comp_grants g
        WHERE g.user_id = 'c1000000-0000-0000-0000-000000000001'
          AND g.product_id = 'beakerstack'
          AND g.revoked_at IS NULL
    ),
    1,
    'grant creates one active billing_comp_grants row'
);

SELECT is(
    (
        SELECT g.comp_reason
        FROM public.billing_comp_grants g
        WHERE g.user_id = 'c1000000-0000-0000-0000-000000000001'
          AND g.revoked_at IS NULL
    ),
    'design partner',
    'grant stores comp_reason'
);

SELECT set_config('request.jwt.claims',
    '{"sub":"c1000000-0000-0000-0000-000000000002","role":"authenticated"}',
    true);
SET LOCAL ROLE authenticated;

SELECT ok(
    (
        public.admin_get_user(
            'c1000000-0000-0000-0000-000000000001'::uuid,
            'beakerstack'
        ) -> 'comp_grant'
    ) IS NOT NULL,
    'admin_get_user includes comp_grant for comped user'
);

SELECT is(
    public.admin_grant_billing_comp(
        'c1000000-0000-0000-0000-000000000001'::uuid,
        'beakerstack', 'beakerstack_vip', 'design partner'
    ) ->> 'unchanged',
    'true',
    'idempotent grant returns unchanged'
);

SELECT is(
    public.admin_grant_billing_comp(
        'c1000000-0000-0000-0000-000000000001'::uuid,
        'beakerstack', 'beakerstack_vip', ''
    ) ->> 'error',
    'invalid_reason',
    'empty grant reason returns invalid_reason'
);

SELECT is(
    public.admin_revoke_billing_comp(
        'c1000000-0000-0000-0000-000000000001'::uuid,
        'beakerstack',
        'offboarding'
    ) ->> 'ok',
    'true',
    'admin revoke comp returns ok'
);

SELECT is(
    public.admin_revoke_billing_comp(
        'c1000000-0000-0000-0000-000000000001'::uuid,
        'beakerstack'
    ) ->> 'unchanged',
    'true',
    'revoke with no active grant returns unchanged'
);

RESET ROLE;

SELECT is(
    (
        SELECT s.status
        FROM public.billing_subscriptions s
        WHERE s.user_id = 'c1000000-0000-0000-0000-000000000001'
          AND s.product_id = 'beakerstack'
    ),
    'free',
    'revoke resets subscription status to free'
);

SELECT ok(
    (
        SELECT g.revoked_at IS NOT NULL
        FROM public.billing_comp_grants g
        WHERE g.user_id = 'c1000000-0000-0000-0000-000000000001'
          AND g.product_id = 'beakerstack'
        ORDER BY g.created_at DESC
        LIMIT 1
    ),
    'revoke marks grant row revoked'
);

-- ── Stripe guard ─────────────────────────────────────────────────────────────
INSERT INTO public.billing_subscriptions (
    user_id, product_id, plan_id, status,
    stripe_customer_id, stripe_subscription_id
)
VALUES (
    'c1000000-0000-0000-0000-000000000001',
    'beakerstack',
    'beakerstack_pro',
    'active',
    'cus_comp_test',
    'sub_comp_test'
)
ON CONFLICT (user_id, product_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id;

SELECT set_config('request.jwt.claims',
    '{"sub":"c1000000-0000-0000-0000-000000000002","role":"authenticated"}',
    true);
SET LOCAL ROLE authenticated;

SELECT is(
    public.admin_grant_billing_comp(
        'c1000000-0000-0000-0000-000000000001'::uuid,
        'beakerstack', 'beakerstack_vip', 'should fail'
    ) ->> 'error',
    'stripe_subscription_active',
    'grant blocked when stripe_subscription_id is set'
);

RESET ROLE;

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.admin_audit_log
        WHERE action = 'admin.billing.comp.grant'
          AND target_id = 'c1000000-0000-0000-0000-000000000001'
    )
    OR EXISTS (
        SELECT 1 FROM public.admin_audit_log
        WHERE action = 'admin.billing.comp.revoke'
          AND target_id = 'c1000000-0000-0000-0000-000000000001'
    ),
    'comp grant or revoke wrote admin audit log'
);

SELECT * FROM finish();
ROLLBACK;

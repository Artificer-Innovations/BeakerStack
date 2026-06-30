-- pgTAP: waitlist provisioning intent + waitlist-billing fulfill conversion
BEGIN;
SELECT plan(14);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'admin_set_waitlist_entry_provisioning_intent'
    ),
    'admin_set_waitlist_entry_provisioning_intent exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'waitlist_billing_fulfill_conversion'
    ),
    'waitlist_billing_fulfill_conversion exists'
);

SELECT ok(
    NOT has_function_privilege(
        'authenticated',
        'public.waitlist_billing_fulfill_conversion(uuid, uuid, text, text[])',
        'EXECUTE'
    ),
    'authenticated cannot execute waitlist_billing_fulfill_conversion'
);

DO $$
BEGIN
  INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
      'd1000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'vip-waitlist-admin@example.com',
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
      'd1000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'vip-waitlist-user@example.com',
      crypt('pw', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

INSERT INTO public.admin_users (user_id)
VALUES ('d1000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL;

INSERT INTO public.waitlist_entries (
    id, email, status, metadata, converted_at, converted_user_id
)
VALUES (
    'd1000000-0000-0000-0000-000000000010',
    'vip-waitlist-user@example.com',
    'converted',
    jsonb_build_object(
        'provisioning_intent', jsonb_build_object(
            'kind', 'billing_comp',
            'planId', 'beakerstack_vip',
            'reason', 'Design partner',
            'grantedBy', 'd1000000-0000-0000-0000-000000000001'
        )
    ),
    now(),
    'd1000000-0000-0000-0000-000000000002'
)
ON CONFLICT (email) DO UPDATE SET
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata,
    converted_at = EXCLUDED.converted_at,
    converted_user_id = EXCLUDED.converted_user_id;

SELECT is(
    public.waitlist_billing_fulfill_conversion(
        'd1000000-0000-0000-0000-000000000002'::uuid,
        'd1000000-0000-0000-0000-000000000010'::uuid,
        'beakerstack',
        ARRAY['beakerstack_vip']::text[]
    )->>'comp_applied',
    'true',
    'fulfill applies comp grant for billing_comp intent'
);

SELECT is(
    public.waitlist_billing_fulfill_conversion(
        'd1000000-0000-0000-0000-000000000002'::uuid,
        'd1000000-0000-0000-0000-000000000010'::uuid,
        'beakerstack',
        ARRAY['beakerstack_vip']::text[]
    )->>'unchanged',
    'true',
    'fulfill is idempotent on re-run'
);

SELECT is(
    (
        SELECT s.status
        FROM public.billing_subscriptions s
        WHERE s.user_id = 'd1000000-0000-0000-0000-000000000002'
          AND s.product_id = 'beakerstack'
    ),
    'comped',
    'fulfill leaves subscription comped'
);

DO $$
BEGIN
  INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
      'd1000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000000',
      'vip-plan-intent@example.com',
      crypt('pw', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

INSERT INTO public.waitlist_entries (
    id, email, status, metadata, converted_at, converted_user_id
)
VALUES (
    'd1000000-0000-0000-0000-000000000012',
    'vip-plan-intent@example.com',
    'converted',
    jsonb_build_object(
        'provisioning_intent', jsonb_build_object(
            'kind', 'billing_plan',
            'planId', 'beakerstack_free'
        )
    ),
    now(),
    'd1000000-0000-0000-0000-000000000003'
)
ON CONFLICT (email) DO UPDATE SET
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata,
    converted_at = EXCLUDED.converted_at,
    converted_user_id = EXCLUDED.converted_user_id;

SELECT is(
    public.waitlist_billing_fulfill_conversion(
        'd1000000-0000-0000-0000-000000000003'::uuid,
        'd1000000-0000-0000-0000-000000000012'::uuid,
        'beakerstack',
        ARRAY['beakerstack_vip']::text[]
    )->>'plan_applied',
    'true',
    'fulfill applies public plan for billing_plan intent'
);

SELECT is(
    (
        SELECT s.plan_id
        FROM public.billing_subscriptions s
        WHERE s.user_id = 'd1000000-0000-0000-0000-000000000003'
          AND s.product_id = 'beakerstack'
    ),
    'beakerstack_free',
    'fulfill billing_plan intent sets subscription plan'
);

INSERT INTO public.waitlist_entries (id, email, status)
VALUES (
    'd1000000-0000-0000-0000-000000000011',
    'vip-approved-only@example.com',
    'approved'
)
ON CONFLICT (email) DO UPDATE SET status = 'approved';

SET LOCAL role TO authenticated;
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true
);
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);

SELECT ok(
    public.admin_is_admin(),
    'vip waitlist admin fixture is recognized as admin'
);

SELECT is(
    public.admin_set_waitlist_entry_provisioning_intent(
        'd1000000-0000-0000-0000-000000000011'::uuid,
        jsonb_build_object(
            'kind', 'billing_comp',
            'planId', 'beakerstack_vip',
            'reason', 'Retroactive VIP'
        ),
        ARRAY['beakerstack_vip']::text[]
    )->>'ok',
    'true',
    'set-intent on approved entry succeeds'
);

SELECT is(
    public.admin_set_waitlist_entry_provisioning_intent(
        'd1000000-0000-0000-0000-000000000011'::uuid,
        NULL,
        ARRAY['beakerstack_vip']::text[]
    )->>'ok',
    'true',
    'null intent clears provisioning_intent'
);

RESET role;

SELECT ok(
    NOT (
        SELECT (metadata ? 'provisioning_intent')
        FROM public.waitlist_entries
        WHERE id = 'd1000000-0000-0000-0000-000000000011'
    ),
    'cleared intent removed from metadata'
);

SET LOCAL role TO authenticated;
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true
);
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);

SELECT is(
    public.admin_set_waitlist_entry_provisioning_intent(
        'd1000000-0000-0000-0000-000000000010'::uuid,
        jsonb_build_object(
            'kind', 'billing_comp',
            'planId', 'beakerstack_vip',
            'reason', 'Too late'
        ),
        ARRAY['beakerstack_vip']::text[]
    )->>'error',
    'invalid_status',
    'set-intent rejects converted entries'
);

SELECT is(
    public.admin_update_waitlist_settings(p_default_plan_id := 'beakerstack_vip')->>'error',
    'invalid_default_plan_id',
    'settings rejects non-public default plan'
);

RESET role;

SELECT * FROM finish();
ROLLBACK;

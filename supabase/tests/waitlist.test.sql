-- pgTAP: waitlist tables, RLS, and RPC access control
BEGIN;
SELECT plan(18);

SELECT has_table('public', 'waitlist_settings', 'waitlist_settings exists');
SELECT has_table('public', 'waitlist_entries', 'waitlist_entries exists');
SELECT has_table('public', 'waitlist_invites', 'waitlist_invites exists');
SELECT has_table('public', 'waitlist_rate_limits', 'waitlist_rate_limits exists');

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'waitlist_entries' AND c.relrowsecurity = true
    ),
    'RLS enabled on waitlist_entries'
);

SELECT is(
    (SELECT count(*)::int FROM pg_policies WHERE tablename = 'waitlist_entries'),
    0,
    'waitlist_entries has no client RLS policies'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'waitlist_get_public_settings'
    ),
    'waitlist_get_public_settings exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'waitlist_capture'
    ),
    'waitlist_capture exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'admin_list_waitlist_entries'
    ),
    'admin_list_waitlist_entries exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'admin_invite_waitlist_email'
    ),
    'admin_invite_waitlist_email exists'
);

-- Settings row (insert for test if missing)
INSERT INTO public.waitlist_settings (id, signup_mode, default_plan_id)
VALUES (1, 'open', 'beakerstack_free')
ON CONFLICT (id) DO NOTHING;

SELECT is(
    (SELECT signup_mode FROM public.waitlist_settings WHERE id = 1),
    'open',
    'default signup_mode is open'
);

-- Capture dedupe: uniform response
SELECT ok(
    (public.waitlist_capture('dedupe-waitlist@example.com', '{}'::jsonb, '127.0.0.1')->>'ok')::boolean,
    'first capture returns ok'
);

SELECT ok(
    (public.waitlist_capture('dedupe-waitlist@example.com', '{}'::jsonb, '127.0.0.2')->>'ok')::boolean,
    'duplicate capture returns ok'
);

SELECT is(
    (SELECT count(*)::int FROM public.waitlist_entries WHERE email = 'dedupe-waitlist@example.com'),
    1,
    'duplicate email creates only one entry'
);

-- Invalid invite returns valid false
SELECT is(
    (public.waitlist_validate_invite('not-a-real-token')->>'valid')::boolean,
    false,
    'invalid token is not valid'
);

-- Non-admin cannot list entries
DO $$
BEGIN
  INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
      'b2000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'waitlist-nonadmin@example.com',
      crypt('pw', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000002"}', true);
SELECT set_config('request.jwt.claim.sub', 'b2000000-0000-0000-0000-000000000002', true);

SELECT is(
    public.admin_list_waitlist_entries()->>'error',
    'not_found',
    'non-admin list returns not_found'
);

RESET role;

-- Admin user for settings validation test
DO $$
BEGIN
  INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
      'b2000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000000',
      'waitlist-admin@example.com',
      crypt('pw', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

INSERT INTO public.admin_users (user_id)
VALUES ('b2000000-0000-0000-0000-000000000003')
ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000003"}', true);

SELECT is(
    public.admin_update_waitlist_settings(p_signup_mode := 'bogus')->>'error',
    'invalid_signup_mode',
    'invalid signup_mode returns structured error'
);

RESET role;

-- billing_ensure_subscription_plan not callable by authenticated (revoked)
SELECT ok(
    NOT has_function_privilege(
        'authenticated',
        'public.billing_ensure_subscription_plan(text, text, uuid)',
        'EXECUTE'
    ),
    'authenticated cannot execute billing_ensure_subscription_plan'
);

SELECT * FROM finish();
ROLLBACK;

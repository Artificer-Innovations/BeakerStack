-- pgTAP: admin tables, RLS, and RPC access control
BEGIN;
SELECT plan(20);

-- ── Schema ───────────────────────────────────────────────────────────────────
SELECT has_table('public', 'admin_users', 'admin_users table exists');
SELECT has_table('public', 'admin_audit_log', 'admin_audit_log table exists');

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'admin_users' AND c.relrowsecurity = true
    ),
    'RLS enabled on admin_users'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'admin_audit_log' AND c.relrowsecurity = true
    ),
    'RLS enabled on admin_audit_log'
);

SELECT is(
    (SELECT count(*)::int FROM pg_policies WHERE tablename = 'admin_users'),
    0,
    'admin_users has no RLS policies for client roles'
);

SELECT is(
    (SELECT count(*)::int FROM pg_policies WHERE tablename = 'admin_audit_log'),
    0,
    'admin_audit_log has no RLS policies for client roles'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'admin_is_admin'
    ),
    'admin_is_admin exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'admin_list_users'
    ),
    'admin_list_users exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'admin_get_user'
    ),
    'admin_get_user exists'
);

-- ── Test users ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  ) VALUES (
      'a1000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'admin-test-user@example.com',
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
      'a1000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'admin-test-operator@example.com',
      crypt('pw', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

INSERT INTO public.admin_users (user_id)
VALUES ('a1000000-0000-0000-0000-000000000002')
ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL;

-- ── Non-admin RPC returns not_found ──────────────────────────────────────────
SELECT set_config('request.jwt.claims',
    '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true);
SET LOCAL ROLE authenticated;

SELECT is(
    public.admin_is_admin(),
    false,
    'non-admin user is not admin'
);

SELECT is(
    public.admin_list_users(10, 0, NULL, 'signup', 'desc', 'beakerstack') ->> 'error',
    'not_found',
    'non-admin admin_list_users returns not_found'
);

SELECT is(
    public.admin_get_user('a1000000-0000-0000-0000-000000000001'::uuid) ->> 'error',
    'not_found',
    'non-admin admin_get_user returns not_found'
);

-- ── Admin RPC succeeds ───────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
    '{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}',
    true);

SELECT ok(
    public.admin_is_admin() = true,
    'operator user is admin'
);

SELECT ok(
    (public.admin_list_users(10, 0, NULL, 'signup', 'desc', 'beakerstack') -> 'total') IS NOT NULL,
    'admin admin_list_users returns total count'
);

SELECT is(
    public.admin_get_user('a1000000-0000-0000-0000-000000000001'::uuid) ->> 'error',
    NULL,
    'admin admin_get_user returns user payload for target'
);

SELECT ok(
    (public.admin_get_user('a1000000-0000-0000-0000-000000000001'::uuid) -> 'auth' ->> 'email')
        = 'admin-test-user@example.com',
    'admin admin_get_user includes target auth email'
);

-- Revoked admin is denied (UPDATE as superuser — RLS blocks authenticated)
RESET ROLE;
UPDATE public.admin_users
SET revoked_at = now()
WHERE user_id = 'a1000000-0000-0000-0000-000000000002';

SELECT ok(
    (SELECT revoked_at IS NOT NULL
     FROM public.admin_users
     WHERE user_id = 'a1000000-0000-0000-0000-000000000002'),
    'revoked_at is set on operator row'
);

SELECT set_config('request.jwt.claims',
    '{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}',
    true);
SET LOCAL ROLE authenticated;

SELECT is(
    public.admin_is_admin(),
    false,
    'revoked operator is not admin'
);

-- Unauthenticated session (no JWT sub) is denied like non-admin
SELECT set_config('request.jwt.claims', '{}', true);

SELECT is(
    public.admin_list_users(10, 0, NULL, 'signup', 'desc', 'beakerstack') ->> 'error',
    'not_found',
    'session without auth uid gets not_found from admin_list_users'
);

RESET ROLE;

SELECT ok(
  (SELECT count(*)::int FROM public.admin_audit_log
   WHERE actor_user_id = 'a1000000-0000-0000-0000-000000000002') >= 1,
  'admin list action wrote audit log row'
);

SELECT * FROM finish();
ROLLBACK;

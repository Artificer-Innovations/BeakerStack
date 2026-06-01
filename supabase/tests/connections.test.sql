-- pgTAP: @beakerstack/connections — schema, RPCs, state machine
BEGIN;
SELECT plan(23);

SELECT has_table('public', 'bs_connections', 'bs_connections exists');
SELECT has_table('public', 'bs_connections_audit', 'bs_connections_audit exists');

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'bs_connections'
          AND c.relrowsecurity = true
    ),
    'RLS enabled on bs_connections'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'connections_request'
    ),
    'connections_request exists'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'connections_get_status'
    ),
    'connections_get_status exists'
);

-- Fixture users
DO $$
BEGIN
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
    ) VALUES
    (
        'c1000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'conn-alice@example.com',
        crypt('pw', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(), now(), 'authenticated', 'authenticated'
    ),
    (
        'c1000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000000',
        'conn-bob@example.com',
        crypt('pw', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(), now(), 'authenticated', 'authenticated'
    ),
    (
        'c1000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000000',
        'conn-carol@example.com',
        crypt('pw', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(), now(), 'authenticated', 'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_profiles (
        user_id, username, display_name, connection_discoverability
    )
    VALUES
        ('c1000000-0000-0000-0000-000000000001', 'conn_alice', 'Alice Conn', 'searchable'),
        ('c1000000-0000-0000-0000-000000000002', 'conn_bob', 'Bob Conn', 'searchable'),
        ('c1000000-0000-0000-0000-000000000003', 'conn_carol', 'Carol Conn', 'searchable')
    ON CONFLICT (user_id) DO UPDATE
    SET username = EXCLUDED.username, display_name = EXCLUDED.display_name;
END;
$$;

-- Alice requests Bob
SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);

SELECT is(
    (SELECT status FROM public.connections_request('c1000000-0000-0000-0000-000000000002') LIMIT 1),
    'pending',
    'alice request to bob is pending'
);

RESET role;

-- Bob accepts
SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);

SELECT is(
    (
        SELECT c.status
        FROM public.connections_accept(
            (SELECT id FROM public.bs_connections LIMIT 1)
        ) c
        LIMIT 1
    ),
    'accepted',
    'bob accepts connection'
);

RESET role;

-- Mutual request auto-accept: Carol requests Alice while we set up pending from Alice to Carol first
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT is(
    (SELECT status FROM public.connections_request('c1000000-0000-0000-0000-000000000003') LIMIT 1),
    'pending',
    'alice to carol pending'
);
RESET role;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
SELECT is(
    (SELECT status FROM public.connections_request('c1000000-0000-0000-0000-000000000001') LIMIT 1),
    'accepted',
    'carol reciprocal request auto-accepts'
);
RESET role;

-- Decline non-resurrection
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT public.connections_request('c1000000-0000-0000-0000-000000000002');
RESET role;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
SELECT public.connections_decline(
    (SELECT id FROM public.bs_connections WHERE initiator_user_id = 'c1000000-0000-0000-0000-000000000001' LIMIT 1)
);
RESET role;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT throws_like(
    $$ SELECT public.connections_request('c1000000-0000-0000-0000-000000000002') $$,
    '%declined%',
    'alice cannot re-request after decline'
);
RESET role;

-- Bob may flip request
SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
SELECT is(
    (SELECT status FROM public.connections_request('c1000000-0000-0000-0000-000000000001') LIMIT 1),
    'pending',
    'bob may request after declining alice'
);
RESET role;

-- Disconnect: either party may re-request
UPDATE public.bs_connections
SET status = 'accepted', accepted_at = now(), declined_at = NULL
WHERE user_low = LEAST(
    'c1000000-0000-0000-0000-000000000001'::uuid,
    'c1000000-0000-0000-0000-000000000002'::uuid
);

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT public.connections_disconnect(
    (SELECT id FROM public.bs_connections WHERE status = 'accepted' LIMIT 1)
);
SELECT is(
    (SELECT status FROM public.connections_request('c1000000-0000-0000-0000-000000000002') LIMIT 1),
    'pending',
    'alice may re-request after disconnect'
);
RESET role;

-- Block hides status from blocked party
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
SELECT public.connections_block('c1000000-0000-0000-0000-000000000001');
RESET role;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT is(
    (SELECT status FROM public.connections_get_status('c1000000-0000-0000-0000-000000000002') LIMIT 1),
    'none',
    'blocked user sees none in get_status'
);
RESET role;

-- Expired pending: UPDATE created_at refresh
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

INSERT INTO public.bs_connections (
    initiator_user_id,
    recipient_user_id,
    status,
    created_at
)
VALUES (
    'c1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'pending',
    now() - interval '31 days'
);

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT is(
    (SELECT status FROM public.connections_request('c1000000-0000-0000-0000-000000000002') LIMIT 1),
    'pending',
    'expired pending renewed by same initiator'
);
SELECT ok(
    (
        SELECT created_at > now() - interval '1 hour'
        FROM public.bs_connections
        WHERE initiator_user_id = 'c1000000-0000-0000-0000-000000000001'
        LIMIT 1
    ),
    'expired pending refresh updates created_at'
);
RESET role;

-- Rate limit: 10 requests per 24h
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

INSERT INTO public.bs_connections_audit (event_type, actor_user_id, other_user_id)
SELECT
    'requested',
    'c1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003'
FROM generate_series(1, 10);

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT throws_like(
    $$ SELECT public.connections_request('c1000000-0000-0000-0000-000000000003') $$,
    '%rate limit%',
    '11th connection request hits rate limit'
);
RESET role;

-- Unblock removes row; status returns none
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
SELECT public.connections_block('c1000000-0000-0000-0000-000000000001');
SELECT public.connections_unblock('c1000000-0000-0000-0000-000000000001');
RESET role;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT is(
    (SELECT status FROM public.connections_get_status('c1000000-0000-0000-0000-000000000002') LIMIT 1),
    'none',
    'unblock clears connection row'
);
RESET role;

-- RLS: alice cannot see bob-carol connection via direct SELECT
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

INSERT INTO public.bs_connections (
    initiator_user_id, recipient_user_id, status, created_at
)
VALUES (
    'c1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000003',
    'accepted',
    now()
);

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT is(
    (SELECT count(*)::integer FROM public.bs_connections),
    0,
    'alice RLS cannot read bob-carol connection'
);
RESET role;

-- Search hides blocked users (bob blocked alice)
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
SELECT public.connections_block('c1000000-0000-0000-0000-000000000001');
RESET role;

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM public.connections_search_users('conn_bob', 20) s
        WHERE s.user_id = 'c1000000-0000-0000-0000-000000000002'
    ),
    'blocked user omitted from search results'
);
RESET role;

-- username_only: exact username only (clear blocks from prior test)
DELETE FROM public.bs_connections;
DELETE FROM public.bs_connections_audit;

UPDATE public.user_profiles
SET connection_discoverability = 'username_only'
WHERE user_id = 'c1000000-0000-0000-0000-000000000002';

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT ok(
    EXISTS (
        SELECT 1
        FROM public.connections_search_users('conn_bob', 20) s
        WHERE s.user_id = 'c1000000-0000-0000-0000-000000000002'
    ),
    'username_only user found on exact username'
);
SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM public.connections_search_users('conn_bo', 20) s
        WHERE s.user_id = 'c1000000-0000-0000-0000-000000000002'
    ),
    'username_only user hidden from partial search'
);
RESET role;

-- hidden: no search and no new requests
UPDATE public.user_profiles
SET connection_discoverability = 'hidden'
WHERE user_id = 'c1000000-0000-0000-0000-000000000002';

SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM public.connections_search_users('conn_bob', 20) s
        WHERE s.user_id = 'c1000000-0000-0000-0000-000000000002'
    ),
    'hidden user omitted from exact username search'
);
SELECT throws_ok(
    $$ SELECT public.connections_request('c1000000-0000-0000-0000-000000000002') $$,
    'P0001',
    'user does not accept connection requests',
    'hidden user rejects connection request'
);
RESET role;

SELECT * FROM finish();
ROLLBACK;

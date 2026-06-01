-- Test user creation trigger and profile generation
-- This test verifies that when a user is created in auth.users,
-- the trigger automatically creates a profile in user_profiles

BEGIN;

SELECT plan(22);

-- Test 1: Verify the trigger function exists
SELECT has_function(
    'public',
    'handle_new_user',
    'handle_new_user function should exist'
);

-- Test 2: Verify the generate_username function exists
SELECT has_function(
    'public',
    'generate_username',
    'generate_username function should exist'
);

-- Test 3: Verify the signup trigger exists
SELECT has_trigger(
    'auth',
    'users',
    'on_auth_user_created',
    'on_auth_user_created trigger should exist on auth.users'
);

-- Test 4: Verify OAuth profile helper exists
SELECT has_function(
    'public',
    'oauth_profile_from_metadata',
    'oauth_profile_from_metadata function should exist'
);

-- Test 5: Verify OAuth profile sync function exists
SELECT has_function(
    'public',
    'sync_oauth_profile_from_auth',
    'sync_oauth_profile_from_auth function should exist'
);

-- Test 6: Verify the OAuth sync trigger exists
SELECT has_trigger(
    'auth',
    'users',
    'on_auth_user_updated_sync_oauth_profile',
    'on_auth_user_updated_sync_oauth_profile trigger should exist on auth.users'
);

-- Test 7: Test that generate_username returns valid format
SELECT matches(
    generate_username(),
    '^user_[a-f0-9]{8}$',
    'generate_username should return user_<8 hex chars>'
);

-- oauth_profile_from_metadata helper coverage
SELECT is(
    (SELECT display_name FROM public.oauth_profile_from_metadata('{}'::jsonb)),
    NULL,
    'oauth_profile_from_metadata returns null display_name for empty metadata'
);

SELECT is(
    (SELECT avatar_url FROM public.oauth_profile_from_metadata('{}'::jsonb)),
    NULL,
    'oauth_profile_from_metadata returns null avatar_url for empty metadata'
);

SELECT is(
    (SELECT display_name FROM public.oauth_profile_from_metadata('{"name":"Fallback Name"}'::jsonb)),
    'Fallback Name',
    'oauth_profile_from_metadata falls back to name key'
);

SELECT is(
    (SELECT avatar_url FROM public.oauth_profile_from_metadata('{"avatar_url":"https://example.com/a.jpg"}'::jsonb)),
    'https://example.com/a.jpg',
    'oauth_profile_from_metadata prefers avatar_url key'
);

-- Test 8-11: Email signup trigger flow
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'trigger-test@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"email":"trigger-test@example.com"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = '00000000-0000-0000-0000-000000000001'
    ),
    'Profile should be created automatically by trigger'
);

SELECT matches(
    (SELECT username FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'),
    '^user_[a-f0-9]{8}$',
    'Profile should have auto-generated username in correct format'
);

SELECT is(
    (SELECT display_name FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'),
    'trigger-test@example.com',
    'Profile display_name should be set to user email'
);

SELECT is(
    (SELECT user_id::text FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'),
    '00000000-0000-0000-0000-000000000001',
    'Profile user_id should match auth.users id'
);

-- Test 12-13: Google OAuth signup seeds display_name and avatar_url
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'google-user@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"email":"google-user@example.com","full_name":"Ada Lovelace","picture":"https://lh3.googleusercontent.com/a/example-photo.jpg"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
);

SELECT is(
    (SELECT display_name FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000002'),
    'Ada Lovelace',
    'Google signup should seed display_name from full_name metadata'
);

SELECT is(
    (SELECT avatar_url FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000002'),
    'https://lh3.googleusercontent.com/a/example-photo.jpg',
    'Google signup should seed avatar_url from picture metadata'
);

-- Test 14: OAuth sign-in backfills empty avatar without overwriting display_name
UPDATE auth.users
SET raw_user_meta_data = '{"email":"trigger-test@example.com","full_name":"Trigger Test","picture":"https://lh3.googleusercontent.com/a/backfill-photo.jpg"}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT is(
    (SELECT display_name FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'),
    'trigger-test@example.com',
    'OAuth sync should not overwrite existing display_name'
);

SELECT is(
    (SELECT avatar_url FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'),
    'https://lh3.googleusercontent.com/a/backfill-photo.jpg',
    'OAuth sync should backfill empty avatar_url'
);

UPDATE auth.users
SET updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT is(
    (SELECT avatar_url FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'),
    'https://lh3.googleusercontent.com/a/backfill-photo.jpg',
    'OAuth sync should skip profile update when raw_user_meta_data is unchanged'
);

-- Test 15-16: OAuth sign-in does not overwrite user-edited profile fields
UPDATE public.user_profiles
SET
    display_name = 'Custom Name',
    avatar_url = 'https://example.com/custom-avatar.jpg'
WHERE user_id = '00000000-0000-0000-0000-000000000002';

UPDATE auth.users
SET raw_user_meta_data = '{"email":"google-user@example.com","full_name":"Google Name","picture":"https://lh3.googleusercontent.com/a/new-google-photo.jpg"}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT display_name FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000002'),
    'Custom Name',
    'OAuth sync should preserve user-edited display_name'
);

SELECT is(
    (SELECT avatar_url FROM public.user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000002'),
    'https://example.com/custom-avatar.jpg',
    'OAuth sync should preserve user-edited avatar_url'
);

SELECT * FROM finish();

ROLLBACK;

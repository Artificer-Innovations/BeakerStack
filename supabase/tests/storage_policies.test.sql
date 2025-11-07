-- Comprehensive Storage Policy Tests for avatars bucket
-- These tests verify that storage bucket policies work correctly

BEGIN;

-- Plan for all tests
SELECT plan(15);

-- Test 1: Verify avatars bucket exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'avatars'
  ),
  'avatars bucket should exist'
);

-- Test 2: Verify bucket configuration
SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'avatars'),
  true,
  'avatars bucket should be public'
);

SELECT is(
  (SELECT file_size_limit::bigint FROM storage.buckets WHERE id = 'avatars'),
  2097152::bigint,
  'avatars bucket should have 2MB file size limit'
);

SELECT ok(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'avatars') @> ARRAY['image/jpeg']::text[],
  'avatars bucket should allow image/jpeg'
);

SELECT ok(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'avatars') @> ARRAY['image/png']::text[],
  'avatars bucket should allow image/png'
);

SELECT ok(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'avatars') @> ARRAY['image/webp']::text[],
  'avatars bucket should allow image/webp'
);

-- Test 3: Verify RLS is enabled on storage.objects
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
    AND c.relname = 'objects'
    AND c.relrowsecurity = true
  ),
  'RLS should be enabled on storage.objects table'
);

-- Test 4: Verify all required storage policies exist
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can upload own avatar'
    AND cmd = 'INSERT'
  ),
  'Policy "Users can upload own avatar" should exist for INSERT'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Avatar images are publicly accessible'
    AND cmd = 'SELECT'
  ),
  'Policy "Avatar images are publicly accessible" should exist for SELECT'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can update own avatar'
    AND cmd = 'UPDATE'
  ),
  'Policy "Users can update own avatar" should exist for UPDATE'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can delete own avatar'
    AND cmd = 'DELETE'
  ),
  'Policy "Users can delete own avatar" should exist for DELETE'
);

-- Test 5: Verify INSERT policy checks bucket_id and user_id
SELECT ok(
  (
    SELECT with_check::text LIKE '%avatars%'
    AND with_check::text LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can upload own avatar'
    AND cmd = 'INSERT'
  ),
  'INSERT policy should check bucket_id is avatars and user_id matches auth.uid()'
);

-- Test 6: Verify SELECT policy allows public access
SELECT ok(
  (
    SELECT qual::text LIKE '%avatars%'
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Avatar images are publicly accessible'
    AND cmd = 'SELECT'
  ),
  'SELECT policy should allow public access to avatars bucket'
);

-- Test 7: Verify UPDATE policy checks bucket_id and user_id
SELECT ok(
  (
    SELECT qual::text LIKE '%avatars%'
    AND qual::text LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can update own avatar'
    AND cmd = 'UPDATE'
  ),
  'UPDATE policy should check bucket_id is avatars and user_id matches auth.uid()'
);

-- Test 8: Verify DELETE policy checks bucket_id and user_id
SELECT ok(
  (
    SELECT qual::text LIKE '%avatars%'
    AND qual::text LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can delete own avatar'
    AND cmd = 'DELETE'
  ),
  'DELETE policy should check bucket_id is avatars and user_id matches auth.uid()'
);

ROLLBACK;


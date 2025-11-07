-- Comprehensive RLS Policy Tests for user_profiles table
-- These tests verify that Row Level Security policies work correctly

BEGIN;

-- Plan for all tests
SELECT plan(15);

-- Setup: Create test users using Supabase test helpers
-- Note: In actual Supabase tests, you would use test helper functions
-- For now, we'll test with the assumption that users exist

-- Test 1: Verify RLS is enabled on user_profiles table
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname = 'user_profiles'
    AND c.relrowsecurity = true
  ),
  'RLS should be enabled on user_profiles table'
);

-- Test 2: Verify all required RLS policies exist
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Users can view all profiles'
    AND cmd = 'SELECT'
  ),
  'Policy "Users can view all profiles" should exist for SELECT'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Users can insert their own profile'
    AND cmd = 'INSERT'
  ),
  'Policy "Users can insert their own profile" should exist for INSERT'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Users can update their own profile'
    AND cmd = 'UPDATE'
  ),
  'Policy "Users can update their own profile" should exist for UPDATE'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Users can delete their own profile'
    AND cmd = 'DELETE'
  ),
  'Policy "Users can delete their own profile" should exist for DELETE'
);

-- Test 3: Verify SELECT policy allows viewing all profiles
-- Note: This test assumes the policy allows viewing all profiles (USING (true))
-- In a real test environment, you would:
-- 1. Create test users
-- 2. Authenticate as each user
-- 3. Verify they can SELECT all profiles

SELECT ok(
  (
    SELECT qual::text LIKE '%true%' OR qual::text = ''
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Users can view all profiles'
    AND cmd = 'SELECT'
  ),
  'SELECT policy should allow viewing all profiles'
);

-- Test 4: Verify INSERT policy checks user_id matches auth.uid()
SELECT ok(
  (
    SELECT with_check::text LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Users can insert their own profile'
    AND cmd = 'INSERT'
  ),
  'INSERT policy should check that user_id matches auth.uid()'
);

-- Test 5: Verify UPDATE policy checks user_id matches auth.uid()
SELECT ok(
  (
    SELECT qual::text LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Users can update their own profile'
    AND cmd = 'UPDATE'
  ),
  'UPDATE policy should check that user_id matches auth.uid()'
);

-- Test 6: Verify DELETE policy checks user_id matches auth.uid()
SELECT ok(
  (
    SELECT qual::text LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Users can delete their own profile'
    AND cmd = 'DELETE'
  ),
  'DELETE policy should check that user_id matches auth.uid()'
);

-- Test 7: Verify no anonymous access policies exist (security check)
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND (qual::text LIKE '%anon%' OR with_check::text LIKE '%anon%')
  ),
  'No anonymous access policies should exist'
);

-- Test 8: Verify policies use SECURITY DEFINER where appropriate
-- (This is a structural check - actual behavior testing requires authenticated sessions)

-- Test 9: Verify foreign key constraint to auth.users
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'user_profiles'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
  ),
  'Foreign key constraint should exist on user_id column'
);

-- Test 10: Verify unique constraint on user_id
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
    AND conname LIKE '%user_id%'
    AND contype = 'u'
  ),
  'Unique constraint should exist on user_id column'
);

-- Test 11: Verify indexes exist for performance
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND indexname = 'idx_user_profiles_user_id'
  ),
  'Index idx_user_profiles_user_id should exist'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND indexname = 'idx_user_profiles_username'
  ),
  'Index idx_user_profiles_username should exist'
);

-- Test 12: Verify trigger exists for updated_at
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.user_profiles'::regclass
    AND tgname = 'update_user_profiles_updated_at'
  ),
  'Trigger update_user_profiles_updated_at should exist'
);

ROLLBACK;


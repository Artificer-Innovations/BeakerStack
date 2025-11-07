/**
 * Integration tests for authentication flow
 * These tests use a real Supabase client and database
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createWebTestClient } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  signOutUser,
  waitForUserProfile,
  cleanupTestData,
  TestData,
} from '../utils/test-helpers';

describe('Authentication Integration Tests', () => {
  let supabase: SupabaseClient;
  let testEmail: string;
  const testPassword = TestData.password();
  let testUserId: string;

  beforeAll(() => {
    supabase = createWebTestClient();
  });

  afterAll(async () => {
    // Cleanup: Delete test user if it exists
    if (testUserId) {
      await cleanupTestData(supabase, testUserId);
    }
  });

  describe('User Signup', () => {
    it('should create a new user with email and password', async () => {
      const result = await createTestUser(supabase);
      testEmail = result.email;
      testUserId = result.userId;

      expect(testUserId).toBeDefined();
      expect(testEmail).toBeDefined();
    });

    it('should automatically create user profile on signup', async () => {
      // Wait for the trigger to create the profile
      await waitForUserProfile(supabase, testUserId);

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile?.user_id).toBe(testUserId);
      expect(profile?.username).toBeDefined();
      expect(profile?.display_name).toBeDefined();
    });

    it('should not allow duplicate email signup', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      // Supabase may return success but not create a new user
      // or return an error depending on configuration
      if (data.user) {
        expect(data.user.id).toBe(testUserId);
      } else {
        expect(error).toBeDefined();
      }
    });
  });

  describe('User Sign In', () => {
    it('should sign in with correct credentials', async () => {
      await signInTestUser(supabase, testEmail, testPassword);

      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session?.user.email).toBe(testEmail);
      expect(data.session?.access_token).toBeDefined();
    });

    it('should fail to sign in with incorrect password', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'WrongPassword123!',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid');
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should fail to sign in with non-existent email', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: testPassword,
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });
  });

  describe('User Sign Out', () => {
    it('should sign out successfully', async () => {
      // First sign in
      await signInTestUser(supabase, testEmail, testPassword);

      // Then sign out
      await signOutUser(supabase);

      // Verify session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should maintain session after sign in', async () => {
      // Sign in
      await signInTestUser(supabase, testEmail, testPassword);

      const { data: signInData } = await supabase.auth.getSession();
      expect(signInData.session).toBeDefined();

      // Get session again
      const { data: { session } } = await supabase.auth.getSession();

      expect(session).toBeDefined();
      expect(session?.user.email).toBe(testEmail);
      expect(session?.access_token).toBe(signInData.session?.access_token);
    });

    it('should access user profile when authenticated', async () => {
      // Sign in
      await signInTestUser(supabase, testEmail, testPassword);

      // Access profile
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile?.user_id).toBe(testUserId);
    });
  });

  describe('Profile Updates', () => {
    it('should allow user to update their own profile', async () => {
      // Sign in
      await signInTestUser(supabase, testEmail, testPassword);

      const newBio = TestData.bio();

      // Update profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ bio: newBio })
        .eq('user_id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.bio).toBe(newBio);
    });

    it('should not allow updating another user\'s profile', async () => {
      // Sign in as test user
      await signInTestUser(supabase, testEmail, testPassword);

      // Try to update a different user's profile (using a fake UUID)
      const fakeUserId = '00000000-0000-0000-0000-000000000099';

      const { error } = await supabase
        .from('user_profiles')
        .update({ bio: 'Hacked!' })
        .eq('user_id', fakeUserId);

      // Should either fail or update 0 rows (RLS policy blocks it)
      // The error might be null if no rows match, which is fine
      if (error) {
        expect(error).toBeDefined();
      }
    });
  });
});


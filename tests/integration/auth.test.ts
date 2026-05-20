/**
 * Authentication API integration tests (signup, sign-in, session).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createWebTestClient } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  signOutUser,
  waitForUserProfile,
  cleanupTestData,
} from '../utils/test-helpers';
import { uniqueTestEmail } from '../utils/integration-fixtures';

describe('Authentication Integration Tests', () => {
  let supabase: SupabaseClient;
  let testEmail: string;
  let testPassword: string;
  let testUserId: string;

  beforeAll(() => {
    supabase = createWebTestClient();
  });

  afterAll(async () => {
    if (testUserId) {
      await cleanupTestData(supabase, testUserId, { email: testEmail });
    }
  });

  describe('User Signup', () => {
    it('should create a new user with email and password', async () => {
      testEmail = uniqueTestEmail();
      const result = await createTestUser(supabase, testEmail);
      testUserId = result.userId;
      testPassword = result.password;

      expect(testUserId).toBeDefined();
      expect(testEmail).toBeDefined();
    });

    it('should automatically create user profile on signup', async () => {
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
      await signInTestUser(supabase, testEmail, testPassword);
      await signOutUser(supabase);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should maintain session after sign in', async () => {
      await signInTestUser(supabase, testEmail, testPassword);

      const { data: signInData } = await supabase.auth.getSession();
      expect(signInData.session).toBeDefined();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      expect(session).toBeDefined();
      expect(session?.user.email).toBe(testEmail);
      expect(session?.access_token).toBe(signInData.session?.access_token);
    });

    it('should access user profile when authenticated', async () => {
      await signInTestUser(supabase, testEmail, testPassword);

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
});

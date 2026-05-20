/**
 * Common test utilities and helpers
 * Provides reusable functions for test setup, teardown, and assertions
 */

import { randomBytes } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';

/** Random password for disposable test users (avoids fixed strings in the repo). */
export function generateTestPassword(): string {
  return `E2e_${randomBytes(16).toString('hex')}_Aa1`;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a test user with email and password
 * Returns the user ID and email
 */
export async function createTestUser(
  supabase: SupabaseClient,
  email?: string,
  password?: string
): Promise<{ userId: string; email: string; password: string }> {
  const testEmail = email || `test-${Date.now()}@example.com`;
  const resolvedPassword = password ?? generateTestPassword();

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: resolvedPassword,
  });

  if (error || !data.user) {
    throw new Error(
      `Failed to create test user: ${error?.message || 'Unknown error'}`
    );
  }

  return { userId: data.user.id, email: testEmail, password: resolvedPassword };
}

/**
 * Sign in a test user
 */
export async function signInTestUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(
  supabase: SupabaseClient
): Promise<{ id: string; email?: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Wait for a user profile to be created (after signup trigger)
 */
export async function waitForUserProfile(
  supabase: SupabaseClient,
  userId: string,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      return;
    }

    await sleep(100);
  }

  throw new Error(`User profile not created within ${timeout}ms`);
}

/**
 * Assert that a user can access their own profile
 */
export async function assertUserCanAccessOwnProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`User cannot access own profile: ${error.message}`);
  }

  if (!data) {
    throw new Error('User profile not found');
  }
}

/**
 * Assert that a user cannot access another user's profile
 */
export async function assertUserCannotAccessOtherProfile(
  supabase: SupabaseClient,
  otherUserId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', otherUserId)
    .single();

  // Should either return an error or no data (RLS blocks it)
  if (!error && data) {
    throw new Error('User should not be able to access other user profile');
  }
}

/**
 * Clean up all test data for a user (prefer service-role teardown in integration tests).
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  userId: string,
  options?: { email?: string }
): Promise<void> {
  try {
    const { cleanupIntegrationTestUser } =
      await import('./integration-fixtures');
    await cleanupIntegrationTestUser(userId, options);
    return;
  } catch {
    // Fall back when service role / admin API unavailable
  }

  try {
    await supabase.from('user_profiles').delete().eq('user_id', userId);
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

/**
 * Generate unique test data
 */
export const TestData = {
  email: () =>
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  username: () =>
    `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  password: () => generateTestPassword(),
  bio: () => `Test bio ${Date.now()}`,
};

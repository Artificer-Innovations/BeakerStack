/**
 * Database test utilities for integration tests
 * Provides helpers for database operations, cleanup, and test data management
 */

import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { generateIntegrationTestEmail } from './test-emails';
import {
  LOCAL_SUPABASE_DEMO_ANON_KEY,
  assertLocalSupabaseEnvironment,
} from './supabase-cli-defaults';

/**
 * Get Supabase URL and anon key from environment variables.
 * Falls back to the public Supabase CLI demo keys when running against a
 * local `supabase start` instance (see ./supabase-cli-defaults.ts).
 */
export function getTestSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || LOCAL_SUPABASE_DEMO_ANON_KEY;

  // Run the local guard whenever the resolved key is the public CLI demo JWT,
  // including when someone copies it into the environment alongside a
  // non-local SUPABASE_URL (which would otherwise bypass the check).
  if (supabaseAnonKey === LOCAL_SUPABASE_DEMO_ANON_KEY) {
    assertLocalSupabaseEnvironment(supabaseUrl);
  }

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Clean up test user data
 * Attempts to delete user profile and sign out
 */
export async function cleanupTestUser(
  supabase: SupabaseClient,
  userId: string,
  credentials?: { email?: string; password?: string }
): Promise<void> {
  try {
    const email = credentials?.email ?? `test-${userId}@example.com`;
    const password = credentials?.password ?? process.env.TEST_PASSWORD;

    // Without a stable password source we cannot authenticate for profile cleanup.
    if (!password) {
      return;
    }

    // Sign in as the user to delete their profile
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError) {
      // Delete the user's profile
      await supabase.from('user_profiles').delete().eq('user_id', userId);
      await supabase.auth.signOut();
    }
  } catch (error) {
    // Ignore cleanup errors - test database will be reset anyway
    console.warn('Cleanup warning:', error);
  }
}

/**
 * Generate a unique test email for integration tests.
 * Uses {@link generateIntegrationTestEmail}; E2E uses {@link generateE2ETestEmail} in test-emails.
 */
export function generateTestEmail(): string {
  return generateIntegrationTestEmail();
}

/**
 * Generate a unique test username.
 * Uses random hex from a UUID so parallel runs rarely collide. The value is
 * capped at 30 characters to satisfy DB / profile schema limits (see
 * packages/shared/src/validation/profileSchema.ts).
 */
export function generateTestUsername(): string {
  const prefix = 'testuser_';
  const hex = randomUUID().replace(/-/g, '');
  const suffix = hex.slice(0, 30 - prefix.length);
  return `${prefix}${suffix}`;
}

/**
 * Wait for a condition to be true (with timeout)
 */
export async function waitFor(
  condition: () => Promise<boolean> | boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for a database record to exist
 */
export async function waitForRecord(
  supabase: SupabaseClient,
  table: string,
  filter: Record<string, unknown>,
  timeout = 5000
): Promise<void> {
  await waitFor(async () => {
    const query = supabase.from(table).select('*').limit(1);
    Object.entries(filter).forEach(([key, value]) => {
      query.eq(key, value);
    });
    const { data, error } = await query;
    return !error && data && data.length > 0;
  }, timeout);
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

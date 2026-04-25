/**
 * Database test utilities for integration tests
 * Provides helpers for database operations, cleanup, and test data management
 */

import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
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
  const supabaseUrl = process.env['SUPABASE_URL'] || 'http://127.0.0.1:54321';
  const supabaseAnonKey =
    process.env['SUPABASE_ANON_KEY'] || LOCAL_SUPABASE_DEMO_ANON_KEY;

  if (!process.env['SUPABASE_ANON_KEY']) {
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
    const password = credentials?.password ?? process.env['TEST_PASSWORD'];

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
 * Generate a unique test email.
 * Uses crypto.randomUUID() to avoid collisions in parallel test runs.
 */
export function generateTestEmail(): string {
  return `test-${randomUUID()}@example.com`;
}

/**
 * Generate a unique test username.
 * Uses crypto.randomUUID() (with hyphens stripped) to avoid collisions in
 * parallel test runs while keeping the username syntactically simple.
 */
export function generateTestUsername(): string {
  return `testuser_${randomUUID().replace(/-/g, '')}`;
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

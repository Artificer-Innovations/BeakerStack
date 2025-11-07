/**
 * Database test utilities for integration tests
 * Provides helpers for database operations, cleanup, and test data management
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get Supabase URL and anon key from environment variables
 * Falls back to local defaults if not set
 */
export function getTestSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Clean up test user data
 * Attempts to delete user profile and sign out
 */
export async function cleanupTestUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    // Sign in as the user to delete their profile
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `test-${userId}@example.com`,
      password: 'TestPassword123!',
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
 * Generate a unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate a unique test username
 */
export function generateTestUsername(): string {
  return `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
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
    await new Promise((resolve) => setTimeout(resolve, interval));
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
  await waitFor(
    async () => {
      const query = supabase.from(table).select('*').limit(1);
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });
      const { data, error } = await query;
      return !error && data && data.length > 0;
    },
    timeout
  );
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
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}


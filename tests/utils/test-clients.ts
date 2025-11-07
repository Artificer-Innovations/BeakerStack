/**
 * Test client factories for creating Supabase clients
 * Provides factories for web and mobile clients with proper configuration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTestSupabaseConfig } from './test-database';

/**
 * Create a Supabase client for web testing
 * Uses standard web configuration (no AsyncStorage)
 */
export function createWebTestClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getTestSupabaseConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Don't persist in tests
    },
  });
}

/**
 * Create a Supabase client for mobile testing
 * Uses mobile configuration with AsyncStorage simulation
 * Note: In tests, we don't actually use AsyncStorage, but we configure
 * the client similarly to how the mobile app would
 */
export function createMobileTestClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getTestSupabaseConfig();

  // For testing, we use the same config as web since we're in Node.js
  // In real mobile tests, you'd need to mock AsyncStorage
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Don't persist in tests
      detectSessionInUrl: false,
    },
  });
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use with caution - only for admin operations in tests
 */
export function createServiceRoleClient(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create multiple test clients for cross-platform testing
 * Returns both web and mobile clients configured for the same database
 */
export function createTestClients() {
  return {
    web: createWebTestClient(),
    mobile: createMobileTestClient(),
    serviceRole: createServiceRoleClient(),
  };
}


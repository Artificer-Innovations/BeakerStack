/**
 * Test data for E2E tests
 * Provides reusable test data that can be used across E2E test flows
 */

import { generateTestPassword } from '../../utils/test-helpers';

/** Email for the seeded “valid login” E2E user (password from {@link getResolvedTestPassword}). */
export const PREDEFINED_VALID_USER_EMAIL = 'e2e-valid@example.com';

let resolvedTestPassword: string | undefined;

/**
 * Password for this process: `TEST_PASSWORD` from the environment when set, otherwise one
 * generated value reused for the lifetime of the process (no hardcoded default in repo).
 * Aligns TypeScript fixtures with Maestro when the shell sets `TEST_PASSWORD`.
 */
export function getResolvedTestPassword(): string {
  if (resolvedTestPassword === undefined) {
    const fromEnv = process.env['TEST_PASSWORD']?.trim();
    resolvedTestPassword =
      fromEnv && fromEnv.length > 0 ? fromEnv : generateTestPassword();
  }
  return resolvedTestPassword;
}

/**
 * Credentials for the predefined valid-login E2E user.
 * Uses {@link getResolvedTestPassword} so the password matches `TEST_PASSWORD` when Maestro sets it.
 */
export function getPredefinedValidLoginUser(): TestUser {
  return { email: PREDEFINED_VALID_USER_EMAIL, password: getResolvedTestPassword() };
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Test user credentials
 */
export interface TestUser {
  email: string;
  password: string;
}

/**
 * Create a test user with unique credentials
 */
export function createTestUser(): TestUser {
  return {
    email: generateTestEmail(),
    password: generateTestPassword(),
  };
}

/**
 * Predefined test users for different scenarios
 */
export const TestUsers = {
  get valid(): TestUser {
    return getPredefinedValidLoginUser();
  },
  invalid: {
    email: 'invalid-email',
    password: 'weak',
  },
};

/**
 * Test profile data
 */
export const TestProfile = {
  bio: 'This is a test bio from E2E tests',
  displayName: 'E2E Test User',
  website: 'https://example.com',
  location: 'Test Location',
};

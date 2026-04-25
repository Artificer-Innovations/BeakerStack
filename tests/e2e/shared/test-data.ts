/**
 * Test data for E2E tests
 * Provides reusable test data that can be used across E2E test flows
 */

import { generateTestPassword } from '../../utils/test-helpers';

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
  valid: {
    email: 'e2e-valid@example.com',
    password: generateTestPassword(),
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

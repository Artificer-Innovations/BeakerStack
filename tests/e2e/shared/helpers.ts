/**
 * Helper functions for E2E tests
 * Provides utility functions that can be used in Maestro flows
 */

/**
 * Wait for a specific amount of time
 * This is a placeholder - actual implementation depends on Maestro
 */
export function wait(ms: number): void {
  // In Maestro, this would be implemented as a wait command
  // This is just for TypeScript type checking
  console.log(`Waiting ${ms}ms`);
}

/**
 * Generate a unique identifier
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Common wait times for E2E tests (in milliseconds)
 */
export const WaitTimes = {
  short: 1000, // 1 second
  medium: 3000, // 3 seconds
  long: 5000, // 5 seconds
  veryLong: 10000, // 10 seconds
};

/**
 * Common retry configurations
 */
export const RetryConfig = {
  maxRetries: 3,
  delay: 1000,
};


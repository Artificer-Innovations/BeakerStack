/**
 * @beakerstack/test-utils
 *
 * Testing utilities for BeakerStack-based projects.
 * This is the initial minimal package; expand as needs emerge.
 */

/**
 * Waits for a specified duration. Useful in tests for simulating async delays.
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a stable test ID for use in test fixtures.
 */
export function testId(prefix = 'test'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

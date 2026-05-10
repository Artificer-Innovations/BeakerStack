/**
 * Shared test email generators for integration and E2E suites.
 *
 * Two prefixes are intentional: integration helpers use `test-` while E2E uses
 * `e2e-test-` so logs and database rows are easy to attribute to the suite.
 */

import { randomUUID } from 'node:crypto';

/**
 * Unique email for integration / API tests.
 * Thin wrapper target: {@link import('./test-database').generateTestEmail}.
 */
export function generateIntegrationTestEmail(): string {
  return `test-${randomUUID()}@example.com`;
}

/**
 * Unique email for Playwright/Maestro E2E flows.
 * Thin wrapper target: {@link import('../e2e/shared/test-data').generateTestEmail}.
 */
export function generateE2ETestEmail(): string {
  return `e2e-test-${randomUUID()}@example.com`;
}

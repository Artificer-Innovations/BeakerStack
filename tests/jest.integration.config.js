/** Tier 1 integration tests (excludes Edge suites). */
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    'edge\\.test\\.ts$',
    'stripe-webhook\\.test\\.ts$',
  ],
};

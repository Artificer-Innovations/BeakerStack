/** Tier 2 Edge Function integration tests. */
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testMatch: [
    '**/tests/integration/billing-edge.test.ts',
    '**/tests/integration/waitlist-edge.test.ts',
    '**/tests/integration/stripe-webhook.test.ts',
  ],
};

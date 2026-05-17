import assert from 'node:assert/strict';
import test from 'node:test';

import {
  supabaseStripeWebhookUrl,
  tierStripeKeysPresent,
  STRIPE_SETUP_TIERS,
} from '../lib/setup-stripe.mjs';

test('supabaseStripeWebhookUrl', () => {
  assert.equal(
    supabaseStripeWebhookUrl('https://abcd1234.supabase.co'),
    'https://abcd1234.supabase.co/functions/v1/stripe-webhook'
  );
  assert.equal(supabaseStripeWebhookUrl('http://localhost:54321'), '');
});

test('tierStripeKeysPresent', () => {
  const tier = STRIPE_SETUP_TIERS.find(t => t.id === 'staging');
  assert.ok(tier);
  assert.ok(
    !tierStripeKeysPresent({ STAGING_STRIPE_SECRET_KEY: 'sk_test_x' }, tier)
  );
  assert.ok(
    tierStripeKeysPresent(
      {
        STAGING_STRIPE_SECRET_KEY: 'sk_test_x',
        STAGING_STRIPE_WEBHOOK_SECRET: 'whsec_x',
      },
      tier
    )
  );
});

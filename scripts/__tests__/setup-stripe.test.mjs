import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isStripeGithubSecretDef,
  resolveSupabaseUrlForStripeTier,
  setupStripeKeysDeferred,
  supabaseStripeWebhookUrl,
  tierStripeKeysPresent,
  STRIPE_SETUP_TIERS,
} from '../lib/setup-stripe.mjs';

test('supabaseStripeWebhookUrl', () => {
  assert.equal(
    supabaseStripeWebhookUrl('https://abcd1234.supabase.co'),
    'https://abcd1234.supabase.co/functions/v1/stripe-webhook'
  );
  assert.equal(supabaseStripeWebhookUrl('not-a-url'), '');
});

test('supabaseStripeWebhookUrl strips trailing slash', () => {
  assert.equal(
    supabaseStripeWebhookUrl('https://abcd1234.supabase.co/'),
    'https://abcd1234.supabase.co/functions/v1/stripe-webhook'
  );
});

test('supabaseStripeWebhookUrl supports local and custom base URLs', () => {
  assert.equal(
    supabaseStripeWebhookUrl('http://127.0.0.1:54321'),
    'http://127.0.0.1:54321/functions/v1/stripe-webhook'
  );
  assert.equal(
    supabaseStripeWebhookUrl('https://api.example.com/custom/path/'),
    'https://api.example.com/custom/path/functions/v1/stripe-webhook'
  );
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

test('isStripeGithubSecretDef matches STRIPE keys', () => {
  assert.ok(isStripeGithubSecretDef({ name: 'STAGING_STRIPE_SECRET_KEY' }));
  assert.ok(
    isStripeGithubSecretDef({ name: 'PRODUCTION_STRIPE_WEBHOOK_SECRET' })
  );
  assert.ok(!isStripeGithubSecretDef({ name: 'AWS_ACCESS_KEY_ID' }));
  assert.ok(!isStripeGithubSecretDef({}));
});

test('setupStripeKeysDeferred', () => {
  assert.ok(setupStripeKeysDeferred({ SETUP_STRIPE_SKIPPED: 'true' }));
  assert.ok(!setupStripeKeysDeferred({ SETUP_STRIPE_SKIPPED: 'false' }));
  assert.ok(!setupStripeKeysDeferred({}));
});

test('resolveSupabaseUrlForStripeTier uses first non-empty key', () => {
  const tier = STRIPE_SETUP_TIERS.find(t => t.id === 'preview');
  assert.ok(tier);
  assert.equal(
    resolveSupabaseUrlForStripeTier(
      { PREVIEW_SUPABASE_URL: 'https://a.supabase.co' },
      tier
    ),
    'https://a.supabase.co'
  );
  assert.equal(
    resolveSupabaseUrlForStripeTier(
      { PR_TESTING_SUPABASE_URL: 'https://b.supabase.co' },
      tier
    ),
    'https://b.supabase.co'
  );
  assert.equal(resolveSupabaseUrlForStripeTier({}, tier), '');
});

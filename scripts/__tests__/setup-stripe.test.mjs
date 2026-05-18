import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ensureTierStripeWebhookSecret,
  isStripeGithubSecretDef,
  resolveSupabaseUrlForStripeTier,
  setupStripeKeysDeferred,
  stripeWebhookDescriptionForTier,
  supabaseStripeWebhookUrl,
  tierStripeKeysPresent,
  STRIPE_SETUP_TIERS,
} from '../lib/setup-stripe.mjs';
import {
  isAutoEnsureStripeWebhookUrl,
  MissingWebhookSecretError,
} from '../lib/ensure-stripe-webhook.mjs';

function makeEnsureTierCtx(overrides = {}) {
  const tier = STRIPE_SETUP_TIERS.find(t => t.id === 'preview');
  assert.ok(tier);
  return {
    acc: { PREVIEW_STRIPE_SECRET_KEY: 'sk_test_abc' },
    tier,
    webhookUrl: 'https://proj.supabase.co/functions/v1/stripe-webhook',
    logInfo: () => {},
    logWarn: () => {},
    applySecret: async () => {},
    ...overrides,
  };
}

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

test('hosted supabase webhook URL is eligible for auto-ensure', () => {
  const url = supabaseStripeWebhookUrl('https://abcd1234.supabase.co');
  assert.ok(isAutoEnsureStripeWebhookUrl(url));
});

test('local supabase webhook URL is not auto-ensured', () => {
  const url = supabaseStripeWebhookUrl('http://127.0.0.1:54321');
  assert.ok(!isAutoEnsureStripeWebhookUrl(url));
});

test('stripeWebhookDescriptionForTier includes tier id', () => {
  const tier = STRIPE_SETUP_TIERS.find(t => t.id === 'staging');
  assert.ok(tier);
  const desc = stripeWebhookDescriptionForTier(
    tier,
    'https://myproj.supabase.co/functions/v1/stripe-webhook'
  );
  assert.match(desc, /staging/);
  assert.match(desc, /myproj/);
});

test('ensureTierStripeWebhookSecret returns true when webhook secret already set', async () => {
  const tier = STRIPE_SETUP_TIERS.find(t => t.id === 'preview');
  assert.ok(tier);
  const ctx = makeEnsureTierCtx({
    acc: {
      PREVIEW_STRIPE_SECRET_KEY: 'sk_test_abc',
      PREVIEW_STRIPE_WEBHOOK_SECRET: 'whsec_existing',
    },
  });
  const result = await ensureTierStripeWebhookSecret(ctx);
  assert.equal(result, true);
});

test('ensureTierStripeWebhookSecret wrong Stripe mode returns false', async () => {
  const warned = [];
  const ctx = makeEnsureTierCtx({
    acc: { PREVIEW_STRIPE_SECRET_KEY: 'sk_live_bad' },
    logWarn: s => warned.push(s),
  });
  const result = await ensureTierStripeWebhookSecret(ctx);
  assert.equal(result, false);
  assert.ok(warned.some(w => /sk_test/.test(w)));
});

test('ensureTierStripeWebhookSecret non-auto-ensure URL returns false', async () => {
  const ctx = makeEnsureTierCtx({
    webhookUrl: 'http://127.0.0.1:54321/functions/v1/stripe-webhook',
  });
  const result = await ensureTierStripeWebhookSecret(ctx);
  assert.equal(result, false);
});

test('ensureTierStripeWebhookSecret MissingWebhookSecretError falls back to false', async () => {
  const url = 'https://proj.supabase.co/functions/v1/stripe-webhook';
  const warned = [];
  const ctx = makeEnsureTierCtx({
    logWarn: s => warned.push(s),
    ensureStripeWebhook: async () => {
      throw new MissingWebhookSecretError(url);
    },
  });
  const result = await ensureTierStripeWebhookSecret(ctx);
  assert.equal(result, false);
  assert.ok(warned.some(w => /signing secret is unknown/.test(w)));
});

test('ensureTierStripeWebhookSecret happy path calls applySecret', async () => {
  const applied = [];
  const ctx = makeEnsureTierCtx({
    applySecret: async (raw, key) => {
      applied.push([raw, key]);
    },
    ensureStripeWebhook: async () => ({
      signingSecret: 'whsec_new',
      created: true,
      endpointId: 'we_123',
      eventsUpdated: false,
    }),
  });
  const result = await ensureTierStripeWebhookSecret(ctx);
  assert.equal(result, true);
  assert.deepEqual(applied, [['whsec_new', 'PREVIEW_STRIPE_WEBHOOK_SECRET']]);
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

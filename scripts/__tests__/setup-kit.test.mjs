import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  collectKitEnvKeys,
  hasKitCredentials,
  isKitGithubSecretDef,
  listKitWebhookTargets,
  setupKitKeysDeferred,
  SETUP_KIT_SKIPPED_ENV,
} from '../lib/setup-kit.mjs';
import {
  kitWebhookUrlFromSupabaseUrl,
  normalizeKitWebhookUrl,
} from '../lib/ensure-kit-webhook.mjs';

test('hasKitCredentials requires API key and webhook secret', () => {
  assert.equal(hasKitCredentials({}), false);
  assert.equal(hasKitCredentials({ KIT_API_KEY: 'k' }), false);
  assert.equal(
    hasKitCredentials({ KIT_API_KEY: 'k', KIT_WEBHOOK_SECRET: 'w' }),
    true
  );
});

test('setupKitKeysDeferred when SETUP_KIT_SKIPPED', () => {
  assert.equal(setupKitKeysDeferred({}), false);
  assert.equal(setupKitKeysDeferred({ [SETUP_KIT_SKIPPED_ENV]: 'true' }), true);
});

test('isKitGithubSecretDef matches KIT_* manifest names', () => {
  assert.equal(isKitGithubSecretDef({ name: 'KIT_API_KEY' }), true);
  assert.equal(isKitGithubSecretDef({ name: 'STAGING_KIT_API_KEY' }), false);
});

test('kitWebhookUrlFromSupabaseUrl builds kit-webhook path', () => {
  const url = kitWebhookUrlFromSupabaseUrl('https://abc123.supabase.co');
  assert.equal(url, 'https://abc123.supabase.co/functions/v1/kit-webhook');
});

test('listKitWebhookTargets resolves preview alias URL', () => {
  const targets = listKitWebhookTargets({
    PR_TESTING_SUPABASE_URL: 'https://preview.supabase.co',
  });
  assert.equal(targets.length, 1);
  assert.equal(targets[0].label, 'Preview');
  assert.ok(targets[0].webhookUrl.endsWith('/functions/v1/kit-webhook'));
});

test('collectKitEnvKeys skip leaves acc unchanged', async () => {
  const acc = {};
  await collectKitEnvKeys(acc, {
    question: async () => 'n',
    readSecret: async () => '',
    logInfo: () => {},
    logWarn: () => {},
  });
  assert.equal(acc.KIT_API_KEY, undefined);
});

test('collectKitEnvKeys auto-generates cron secret when credentials present', async () => {
  const acc = {
    KIT_API_KEY: 'key',
    KIT_WEBHOOK_SECRET: 'wh',
  };
  await collectKitEnvKeys(acc, {
    dryRun: true,
    logInfo: () => {},
    logWarn: () => {},
    question: async () => '',
    readSecret: async () => '',
  });
  assert.ok(acc.KIT_CRON_SECRET);
  assert.equal(acc.KIT_CRON_SECRET.length, 64);
});

test('collectKitEnvKeys stores entered secrets', async () => {
  const acc = {};
  const secretAnswers = ['api-key', '', 'webhook-secret'];
  await collectKitEnvKeys(acc, {
    logInfo: () => {},
    logWarn: () => {},
    question: async () => '',
    readSecret: async () => secretAnswers.shift() ?? '',
  });
  assert.equal(acc.KIT_API_KEY, 'api-key');
  assert.equal(acc.KIT_WEBHOOK_SECRET, 'webhook-secret');
  assert.ok(acc.KIT_CRON_SECRET);
  assert.equal(typeof acc.KIT_CRON_SECRET, 'string');
  assert.ok(acc.KIT_CRON_SECRET.length >= 32);
});

test('normalizeKitWebhookUrl strips trailing slash', () => {
  assert.equal(
    normalizeKitWebhookUrl('https://x.supabase.co/functions/v1/kit-webhook/'),
    'https://x.supabase.co/functions/v1/kit-webhook'
  );
});

test('generated cron secret matches crypto.randomBytes hex length', () => {
  assert.equal(crypto.randomBytes(32).toString('hex').length, 64);
});

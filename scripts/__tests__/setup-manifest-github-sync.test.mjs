import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectGithubSecretPayload,
  listMissingRequiredGithubCiDetails,
  listMissingRequiredGithubForCi,
  mergeGithubSyncEnv,
  resolveSetupFromPhase,
} from '../lib/setup-manifest.mjs';

test('listMissingRequiredGithubForCi omits Stripe when SETUP_STRIPE_SKIPPED', () => {
  const missing = listMissingRequiredGithubForCi({
    SETUP_STRIPE_SKIPPED: 'true',
    SUPABASE_ACCESS_TOKEN: 'pat',
    AWS_ACCESS_KEY_ID: 'x',
    AWS_SECRET_ACCESS_KEY: 'y',
  });
  assert.ok(!missing.some(m => m.name.includes('STRIPE')));
});

test('listMissingRequiredGithubCiDetails includes primaryEnvKey and groups core before aws', () => {
  const details = listMissingRequiredGithubCiDetails({});
  assert.ok(details.length > 0);
  const coreIdx = details.findIndex(d => d.group === 'core');
  const awsIdx = details.findIndex(d => d.group === 'aws');
  assert.ok(coreIdx !== -1 && awsIdx !== -1);
  assert.ok(coreIdx < awsIdx);
  const core = details.find(d => d.name === 'SUPABASE_ACCESS_TOKEN');
  assert.ok(
    core &&
      core.primaryEnvKey === 'SUPABASE_ACCESS_TOKEN' &&
      core.kind === 'secret'
  );
});

test('resolveSetupFromPhase maps gh to github', () => {
  assert.equal(resolveSetupFromPhase('gh'), 'github');
  assert.equal(resolveSetupFromPhase('github'), 'github');
  assert.equal(resolveSetupFromPhase(' supabase '), 'supabase');
});

test('mergeGithubSyncEnv: later file layers override earlier; session overrides all', () => {
  const merged = mergeGithubSyncEnv(
    { AWS_ACCESS_KEY_ID: 'from-session', EXPO_TOKEN: 'tok' },
    { AWS_ACCESS_KEY_ID: 'from-local', STAGING_SUPABASE_URL: 'https://local' },
    { AWS_ACCESS_KEY_ID: 'from-cloud', STAGING_SUPABASE_URL: 'https://cloud' },
    { AWS_ACCESS_KEY_ID: 'from-aws-file' }
  );
  assert.equal(merged.AWS_ACCESS_KEY_ID, 'from-session');
  assert.equal(merged.STAGING_SUPABASE_URL, 'https://cloud');
  assert.equal(merged.EXPO_TOKEN, 'tok');
});

test('mergeGithubSyncEnv: disk-only keys appear when session omits them', () => {
  const merged = mergeGithubSyncEnv(
    {},
    {},
    { AWS_SECRET_ACCESS_KEY: 'sec', SUPABASE_ACCESS_TOKEN: 'pat' },
    {}
  );
  assert.equal(merged.AWS_SECRET_ACCESS_KEY, 'sec');
  assert.equal(merged.SUPABASE_ACCESS_TOKEN, 'pat');
});

test('collectGithubSecretPayload picks up values supplied only via merged disk-style env', () => {
  const env = mergeGithubSyncEnv(
    { EXPO_TOKEN: 'expo' },
    {},
    {
      AWS_ACCESS_KEY_ID: 'AKIA',
      AWS_SECRET_ACCESS_KEY: 'secret',
      SUPABASE_ACCESS_TOKEN: 'sbp_pat',
      STAGING_SUPABASE_URL: 'https://stg.supabase.co',
      STAGING_SUPABASE_ANON_KEY: 'anon',
      STAGING_SUPABASE_PROJECT_REF: 'ref',
      STAGING_SUPABASE_DB_PASSWORD: 'pw',
      STAGING_STRIPE_SECRET_KEY: 'sk_test_staging',
      STAGING_STRIPE_WEBHOOK_SECRET: 'whsec_staging',
      STAGING_BILLING_ALLOWED_ORIGINS:
        'https://staging.app.example,https://app.example',
      PRODUCTION_SUPABASE_URL: 'https://prd.supabase.co',
      PRODUCTION_SUPABASE_ANON_KEY: 'anon2',
      PRODUCTION_SUPABASE_PROJECT_REF: 'ref2',
      PRODUCTION_SUPABASE_DB_PASSWORD: 'pw2',
      PRODUCTION_STRIPE_SECRET_KEY: 'sk_live_production',
      PRODUCTION_STRIPE_WEBHOOK_SECRET: 'whsec_production',
      PREVIEW_SUPABASE_URL: 'https://pv.supabase.co',
      PREVIEW_SUPABASE_ANON_KEY: 'anonp',
      SUPABASE_PREVIEW_PROJECT_REF: 'pref',
      SUPABASE_PREVIEW_DB_PASSWORD: 'pwp',
      SUPABASE_PREVIEW_DB_URL: 'postgresql://x',
      PREVIEW_STRIPE_SECRET_KEY: 'sk_test_preview',
      PREVIEW_STRIPE_WEBHOOK_SECRET: 'whsec_preview',
      PR_PREVIEW_CERTIFICATE_ARN: 'arn:aws:acm:…',
      EXPO_PROJECT_ID: 'uuid',
    },
    {}
  );
  const payload = collectGithubSecretPayload(env);
  assert.equal(payload.AWS_ACCESS_KEY_ID, 'AKIA');
  assert.equal(payload.SUPABASE_ACCESS_TOKEN, 'sbp_pat');
  assert.ok(payload.STAGING_SUPABASE_URL);
  assert.equal(
    payload.STAGING_BILLING_ALLOWED_ORIGINS,
    'https://staging.app.example,https://app.example'
  );
  assert.ok(payload.PR_PREVIEW_CERTIFICATE_ARN);
});

test('listMissingRequiredGithubForCi: empty env lists all required manifest entries', () => {
  const missing = listMissingRequiredGithubForCi({});
  assert.ok(missing.length > 5);
  assert.ok(
    missing.some(m => m.name === 'AWS_ACCESS_KEY_ID' && m.kind === 'secret')
  );
  assert.ok(
    missing.some(m => m.name === 'PR_PREVIEW_DOMAIN' && m.kind === 'variable')
  );
});

test('listMissingRequiredGithubForCi: satisfied required entries are omitted', () => {
  const env = mergeGithubSyncEnv(
    {},
    {},
    {
      SUPABASE_ACCESS_TOKEN: 't',
      AWS_ACCESS_KEY_ID: 'a',
      AWS_SECRET_ACCESS_KEY: 'b',
      STAGING_SUPABASE_URL: 'u1',
      STAGING_SUPABASE_ANON_KEY: 'k1',
      STAGING_SUPABASE_PROJECT_REF: 'r1',
      STAGING_SUPABASE_DB_PASSWORD: 'p1',
      STAGING_STRIPE_SECRET_KEY: 'sk_test_staging',
      STAGING_STRIPE_WEBHOOK_SECRET: 'whsec_staging',
      PRODUCTION_SUPABASE_URL: 'u2',
      PRODUCTION_SUPABASE_ANON_KEY: 'k2',
      PRODUCTION_SUPABASE_PROJECT_REF: 'r2',
      PRODUCTION_SUPABASE_DB_PASSWORD: 'p2',
      PRODUCTION_STRIPE_SECRET_KEY: 'sk_live_production',
      PRODUCTION_STRIPE_WEBHOOK_SECRET: 'whsec_production',
      PREVIEW_SUPABASE_URL: 'u3',
      PREVIEW_SUPABASE_ANON_KEY: 'k3',
      SUPABASE_PREVIEW_PROJECT_REF: 'r3',
      SUPABASE_PREVIEW_DB_PASSWORD: 'p3',
      SUPABASE_PREVIEW_DB_URL: 'postgresql://x',
      PREVIEW_STRIPE_SECRET_KEY: 'sk_test_preview',
      PREVIEW_STRIPE_WEBHOOK_SECRET: 'whsec_preview',
      PR_PREVIEW_CERTIFICATE_ARN: 'arn',
      EXPO_TOKEN: 'et',
      EXPO_PROJECT_ID: 'ep',
    },
    {}
  );
  Object.assign(env, {
    PR_PREVIEW_DOMAIN: 'd.example',
    PR_PREVIEW_HOSTED_ZONE_ID: 'Z1',
    PR_PREVIEW_STACK_NAME: 'stack',
    EXPO_ACCOUNT: 'acct',
  });
  const missing = listMissingRequiredGithubForCi(env);
  assert.equal(missing.length, 0);
});

test('listMissingRequiredGithubForCi: optional google block not required', () => {
  const env = mergeGithubSyncEnv(
    {},
    {},
    {
      SUPABASE_ACCESS_TOKEN: 't',
      AWS_ACCESS_KEY_ID: 'a',
      AWS_SECRET_ACCESS_KEY: 'b',
      STAGING_SUPABASE_URL: 'u1',
      STAGING_SUPABASE_ANON_KEY: 'k1',
      STAGING_SUPABASE_PROJECT_REF: 'r1',
      STAGING_SUPABASE_DB_PASSWORD: 'p1',
      STAGING_STRIPE_SECRET_KEY: 'sk_test_staging',
      STAGING_STRIPE_WEBHOOK_SECRET: 'whsec_staging',
      PRODUCTION_SUPABASE_URL: 'u2',
      PRODUCTION_SUPABASE_ANON_KEY: 'k2',
      PRODUCTION_SUPABASE_PROJECT_REF: 'r2',
      PRODUCTION_SUPABASE_DB_PASSWORD: 'p2',
      PRODUCTION_STRIPE_SECRET_KEY: 'sk_live_production',
      PRODUCTION_STRIPE_WEBHOOK_SECRET: 'whsec_production',
      PREVIEW_SUPABASE_URL: 'u3',
      PREVIEW_SUPABASE_ANON_KEY: 'k3',
      SUPABASE_PREVIEW_PROJECT_REF: 'r3',
      SUPABASE_PREVIEW_DB_PASSWORD: 'p3',
      SUPABASE_PREVIEW_DB_URL: 'postgresql://x',
      PREVIEW_STRIPE_SECRET_KEY: 'sk_test_preview',
      PREVIEW_STRIPE_WEBHOOK_SECRET: 'whsec_preview',
      PR_PREVIEW_CERTIFICATE_ARN: 'arn',
      EXPO_TOKEN: 'et',
      EXPO_PROJECT_ID: 'ep',
      PR_PREVIEW_DOMAIN: 'd',
      PR_PREVIEW_HOSTED_ZONE_ID: 'z',
      PR_PREVIEW_STACK_NAME: 's',
      EXPO_ACCOUNT: 'acct',
    },
    {}
  );
  const missing = listMissingRequiredGithubForCi(env);
  assert.equal(missing.length, 0);
});

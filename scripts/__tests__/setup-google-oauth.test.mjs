import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectSupabaseGoogleOAuthIntoAcc,
  hasSupabaseGoogleOAuthCredentials,
} from '../lib/setup-google-oauth.mjs';

function mockRl(answers) {
  let i = 0;
  return {
    question: async () => answers[i++] ?? '',
  };
}

test('hasSupabaseGoogleOAuthCredentials requires both id and secret', () => {
  assert.equal(hasSupabaseGoogleOAuthCredentials({}), false);
  assert.equal(
    hasSupabaseGoogleOAuthCredentials({
      SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: 'id',
    }),
    false
  );
  assert.equal(
    hasSupabaseGoogleOAuthCredentials({
      SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: 'id',
      SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET: 'sec',
    }),
    true
  );
});

test('collectSupabaseGoogleOAuthIntoAcc stores credentials from prompts', async () => {
  const acc = { GOOGLE_SERVICES_WEB_CLIENT_ID: 'web-client-id' };
  const rl = mockRl(['', '', '']);
  await collectSupabaseGoogleOAuthIntoAcc(
    async () => 'client-secret',
    async q => rl.question(q),
    acc,
    { logInfo: () => {}, logWarn: () => {} }
  );
  assert.equal(acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID, 'web-client-id');
  assert.equal(acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET, 'client-secret');
});

test('collectSupabaseGoogleOAuthIntoAcc skip leaves acc unchanged', async () => {
  const acc = {};
  const rl = mockRl(['n']);
  await collectSupabaseGoogleOAuthIntoAcc(
    async () => 'secret',
    async q => rl.question(q),
    acc,
    { logInfo: () => {}, logWarn: () => {} }
  );
  assert.equal(hasSupabaseGoogleOAuthCredentials(acc), false);
});

test('collectSupabaseGoogleOAuthIntoAcc drops partial id when secret skipped', async () => {
  const acc = {};
  const rl = mockRl(['', 'my-client-id', '']);
  await collectSupabaseGoogleOAuthIntoAcc(
    async () => '',
    async q => rl.question(q),
    acc,
    { logInfo: () => {}, logWarn: () => {} }
  );
  assert.equal(acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID, undefined);
});

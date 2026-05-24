import assert from 'node:assert/strict';
import test from 'node:test';

import { pickKitGithubPayload, phaseKit } from '../setup-kit.mjs';
import { collectGithubSecretPayload } from '../lib/setup-manifest.mjs';
import { SETUP_KIT_SKIPPED_ENV } from '../lib/setup-kit.mjs';

test('pickKitGithubPayload selects only KIT_* keys', () => {
  const acc = {
    KIT_API_KEY: 'k',
    KIT_CRON_SECRET: 'c',
    KIT_WEBHOOK_SECRET: 'w',
    STAGING_SUPABASE_URL: 'https://x.supabase.co',
  };
  const all = collectGithubSecretPayload(acc);
  const kit = pickKitGithubPayload(acc, all);
  assert.deepEqual(kit, {
    KIT_API_KEY: 'k',
    KIT_CRON_SECRET: 'c',
    KIT_WEBHOOK_SECRET: 'w',
  });
});

test('phaseKit with skipKit sets SETUP_KIT_SKIPPED', async () => {
  const acc = {};
  const rl = { question: async () => '', close() {} };
  await phaseKit({ skipKit: true }, rl, acc);
  assert.equal(acc[SETUP_KIT_SKIPPED_ENV], 'true');
});

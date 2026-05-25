import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assignEmailCiToAcc,
  pickEmailGithubPayload,
} from '../lib/setup-resend-keys.mjs';

test('assignEmailCiToAcc sets RESEND_SMTP_PASS from SMTP_PASS', () => {
  const acc = assignEmailCiToAcc(
    {},
    {
      SMTP_PASS: 're_send_only',
      SMTP_ADMIN_EMAIL: 'notifications@auth.example.com',
      SMTP_SENDER_NAME: 'Example',
    }
  );
  assert.equal(acc.SMTP_PASS, 're_send_only');
  assert.equal(acc.RESEND_SMTP_PASS, 're_send_only');
  assert.equal(acc.PREVIEW_SMTP_PASS, undefined);
});

test('pickEmailGithubPayload only includes email CI names', () => {
  const { secrets, variables } = pickEmailGithubPayload(
    {
      RESEND_SMTP_PASS: 're_x',
      STAGING_STRIPE_SECRET_KEY: 'sk_test',
      RESEND_API_KEY: 're_full',
    },
    { SMTP_ADMIN_EMAIL: 'a@b.com', PR_PREVIEW_DOMAIN: 'example.com' }
  );
  assert.deepEqual(secrets, { RESEND_SMTP_PASS: 're_x' });
  assert.deepEqual(variables, { SMTP_ADMIN_EMAIL: 'a@b.com' });
  assert.equal(secrets.RESEND_API_KEY, undefined);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { formatSetupLogMessage } from '../setup-full.mjs';

test('formatSetupLogMessage redacts password and token query params', () => {
  const msg = formatSetupLogMessage('connecting with password=supersecret token=abcd1234');
  assert.match(msg, /^\[setup\] /);
  assert.ok(!msg.includes('supersecret'));
  assert.ok(!msg.includes('abcd1234'));
  assert.match(msg, /password=\[redacted\]/);
  assert.match(msg, /token=\[redacted\]/);
});

test('formatSetupLogMessage redacts postgres password in URIs', () => {
  const msg = formatSetupLogMessage('postgresql://postgres:my-db-password@db.example:5432/postgres');
  assert.ok(!msg.includes('my-db-password'));
  assert.match(msg, /postgresql:\/\/postgres:\[redacted\]@db\.example:5432\/postgres/);
});

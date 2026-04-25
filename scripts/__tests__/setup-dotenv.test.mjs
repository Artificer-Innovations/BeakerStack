import assert from 'node:assert/strict';
import test from 'node:test';

import { escapeDotEnvDoubleQuotedValue, parseDotEnv } from '../lib/setup-dotenv.mjs';

test('parseDotEnv strips export prefix', () => {
  const out = parseDotEnv('export AWS_ACCESS_KEY_ID=AKIA\nexport FOO="bar"\n');
  assert.equal(out.AWS_ACCESS_KEY_ID, 'AKIA');
  assert.equal(out.FOO, 'bar');
});

test('parseDotEnv EXPORT uppercase prefix', () => {
  const out = parseDotEnv('EXPORT X=1\n');
  assert.equal(out.X, '1');
});

test('parseDotEnv plain KEY=value unchanged', () => {
  const out = parseDotEnv('KEY=value\n');
  assert.equal(out.KEY, 'value');
});

test('escapeDotEnvDoubleQuotedValue escapes double quotes', () => {
  assert.equal(escapeDotEnvDoubleQuotedValue('say "hi"'), 'say \\"hi\\"');
});

test('escapeDotEnvDoubleQuotedValue escapes backslashes before quotes', () => {
  assert.equal(escapeDotEnvDoubleQuotedValue('C:\\temp\\'), 'C:\\\\temp\\\\');
});

test('escapeDotEnvDoubleQuotedValue escapes backslash then quote', () => {
  const v = '\\"'; // one backslash + one quote
  assert.equal(escapeDotEnvDoubleQuotedValue(v), '\\\\\\"');
});

test('escapeDotEnvDoubleQuotedValue empty string', () => {
  assert.equal(escapeDotEnvDoubleQuotedValue(''), '');
});

test('escapeDotEnvDoubleQuotedValue coerces non-string', () => {
  assert.equal(escapeDotEnvDoubleQuotedValue(42), '42');
});

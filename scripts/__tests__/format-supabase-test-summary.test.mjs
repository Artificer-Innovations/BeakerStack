import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MARKER,
  buildComment,
  parseJest,
  parsePgTap,
  parseVitest,
  stripAnsi,
} from '../format-supabase-test-summary.mjs';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(THIS_DIR, 'fixtures');

const fixture = name => readFileSync(path.join(FIXTURES, name), 'utf8');

// ── pgTAP ──────────────────────────────────────────────────────────────────

test('parsePgTap — passing log', () => {
  const result = parsePgTap(fixture('db-tests-pass.log'));
  assert.equal(result.available, true);
  assert.equal(result.ok, true);
  assert.equal(result.filesTotal, 3);
  assert.equal(result.filesPassed, 3);
  assert.equal(result.filesFailed, 0);
  assert.equal(result.testsTotal, 42);
  assert.equal(result.testsFailed, 0);
  assert.equal(result.testsPassed, 42);
  assert.deepEqual(result.failingFiles, []);
  assert.equal(result.excerpt, '');
});

test('parsePgTap — failing log', () => {
  const result = parsePgTap(fixture('db-tests-fail.log'));
  assert.equal(result.available, true);
  assert.equal(result.ok, false);
  assert.equal(result.filesTotal, 3);
  assert.equal(result.filesPassed, 2);
  assert.equal(result.filesFailed, 1);
  assert.equal(result.testsTotal, 42);
  assert.equal(result.testsFailed, 2);
  assert.equal(result.testsPassed, 40);
  assert.deepEqual(result.failingFiles, [
    'supabase/tests/db/002_auth_tests.sql',
  ]);
  assert.ok(
    result.excerpt.includes('not ok 1'),
    'excerpt should include first not-ok line'
  );
  assert.ok(
    result.excerpt.includes('not ok 2'),
    'excerpt should include second not-ok line'
  );
});

test('parsePgTap — empty log returns unavailable', () => {
  const result = parsePgTap('');
  assert.equal(result.available, false);
  assert.equal(result.ok, false);
});

test('parsePgTap — excerpt capped at MAX_EXCERPT_LINES', () => {
  const manyNotOk = Array.from(
    { length: 50 },
    (_, i) => `not ok ${i + 1} - test ${i + 1}`
  ).join('\n');
  const log = `supabase/tests/db/001.sql .. FAILED\n${manyNotOk}\nFiles=1, Tests=50,  1 wallclock secs\nResult: FAIL\n`;
  const result = parsePgTap(log);
  const excerptLines = result.excerpt.split('\n').filter(Boolean);
  assert.ok(
    excerptLines.length <= 25,
    `excerpt should be capped at 25 lines, got ${excerptLines.length}`
  );
});

// ── Jest ───────────────────────────────────────────────────────────────────

test('parseJest — passing log', () => {
  const log = fixture('integration-pass.log');
  const lines = stripAnsi(log).split(/\r?\n/);
  const result = parseJest(lines);
  assert.equal(result.available, true);
  assert.equal(result.ok, true);
  assert.equal(result.suitesTotal, 3);
  assert.equal(result.suitesPassed, 3);
  assert.equal(result.suitesFailed, 0);
  assert.equal(result.testsTotal, 22);
  assert.equal(result.testsPassed, 22);
  assert.equal(result.testsFailed, 0);
  assert.deepEqual(result.failingSuites, []);
});

test('parseJest — failing log', () => {
  const log = fixture('integration-fail.log');
  const lines = stripAnsi(log).split(/\r?\n/);
  const result = parseJest(lines);
  assert.equal(result.available, true);
  assert.equal(result.ok, false);
  assert.equal(result.suitesTotal, 3);
  assert.equal(result.suitesPassed, 2);
  assert.equal(result.suitesFailed, 1);
  assert.equal(result.testsTotal, 22);
  assert.equal(result.testsFailed, 2);
  assert.equal(result.testsPassed, 20);
  assert.deepEqual(result.failingSuites, ['tests/integration/auth.test.ts']);
});

test('parseJest — empty log returns unavailable', () => {
  const result = parseJest([]);
  assert.equal(result.available, false);
});

// ── Vitest ─────────────────────────────────────────────────────────────────

test('parseVitest — passing log', () => {
  const log = fixture('integration-pass.log');
  const lines = stripAnsi(log).split(/\r?\n/);
  const result = parseVitest(lines);
  assert.equal(result.available, true);
  assert.equal(result.ok, true);
  assert.equal(result.filesTotal, 1);
  assert.equal(result.filesPassed, 1);
  assert.equal(result.filesFailed, 0);
  assert.equal(result.testsTotal, 4);
  assert.equal(result.testsPassed, 4);
  assert.equal(result.testsFailed, 0);
  assert.deepEqual(result.failingFiles, []);
});

test('parseVitest — failing log', () => {
  const log = fixture('integration-fail.log');
  const lines = stripAnsi(log).split(/\r?\n/);
  const result = parseVitest(lines);
  assert.equal(result.available, true);
  assert.equal(result.ok, false);
  assert.equal(result.filesTotal, 1);
  assert.equal(result.filesFailed, 1);
  assert.equal(result.filesPassed, 0);
  assert.equal(result.testsTotal, 4);
  assert.equal(result.testsFailed, 1);
  assert.equal(result.testsPassed, 3);
  assert.deepEqual(result.failingFiles, ['apps/web/src/lib/supabase.test.ts']);
});

test('parseVitest — empty log returns unavailable', () => {
  const result = parseVitest([]);
  assert.equal(result.available, false);
});

// ── buildComment ───────────────────────────────────────────────────────────

test('buildComment — all passing includes marker and success indicators', () => {
  const pgtap = parsePgTap(fixture('db-tests-pass.log'));
  const log = fixture('integration-pass.log');
  const lines = stripAnsi(log).split(/\r?\n/);
  const jest = parseJest(lines);
  const vitest = parseVitest(lines);

  const comment = buildComment({
    pgtap,
    jest,
    vitest,
    migrationResult: 'success',
  });

  assert.ok(comment.includes(MARKER), 'must include marker');
  assert.ok(comment.includes('✅ Pass'), 'must show pass status');
  assert.ok(!comment.includes('❌'), 'must not show failures');
  assert.ok(comment.includes('db-tests-log'), 'must reference artifact names');
  assert.ok(
    comment.includes('integration-log'),
    'must reference artifact names'
  );
});

test('buildComment — failures show failing file names', () => {
  const pgtap = parsePgTap(fixture('db-tests-fail.log'));
  const log = fixture('integration-fail.log');
  const lines = stripAnsi(log).split(/\r?\n/);
  const jest = parseJest(lines);
  const vitest = parseVitest(lines);

  const comment = buildComment({
    pgtap,
    jest,
    vitest,
    migrationResult: 'success',
  });

  assert.ok(
    comment.includes('002_auth_tests.sql'),
    'must list failing pgTAP file'
  );
  assert.ok(
    comment.includes('tests/integration/auth.test.ts'),
    'must list failing Jest suite'
  );
  assert.ok(
    comment.includes('apps/web/src/lib/supabase.test.ts'),
    'must list failing Vitest file'
  );
  assert.ok(comment.includes('❌'), 'must show failure status');
});

test('buildComment — migration failure shown in table', () => {
  const pgtap = parsePgTap('');
  const jest = parseJest([]);
  const vitest = parseVitest([]);

  const comment = buildComment({
    pgtap,
    jest,
    vitest,
    migrationResult: 'failure',
  });

  assert.ok(
    comment.includes('Migration filename format'),
    'must include migration row'
  );
  assert.ok(comment.includes('❌ Fail'), 'must show migration failure');
});

test('buildComment — pgTAP failure excerpt wrapped in details block', () => {
  const pgtap = parsePgTap(fixture('db-tests-fail.log'));
  const jest = parseJest([]);
  const vitest = parseVitest([]);

  const comment = buildComment({
    pgtap,
    jest,
    vitest,
    migrationResult: 'success',
  });

  assert.ok(
    comment.includes('<details>'),
    'must have details block for excerpt'
  );
  assert.ok(comment.includes('not ok 1'), 'excerpt must appear in comment');
});

test('buildComment — unavailable logs show placeholder text', () => {
  const pgtap = parsePgTap('');
  const jest = parseJest([]);
  const vitest = parseVitest([]);

  const comment = buildComment({
    pgtap,
    jest,
    vitest,
    migrationResult: 'skipped',
  });

  assert.ok(
    comment.includes('Log not available'),
    'must show placeholder for missing logs'
  );
});

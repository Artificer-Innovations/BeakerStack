import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MARKER,
  buildComment,
  formatMinutes,
  parsePlaywrightJson,
} from '../ci/format-playwright-e2e-pr-comment.mjs';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures'
);

test('formatMinutes converts ms to minutes', () => {
  assert.equal(formatMinutes(13_800), '0.23 min');
  assert.equal(formatMinutes(168_000), '2.80 min');
});

test('parsePlaywrightJson classifies passed, retry, skipped, and failed', () => {
  const report = JSON.parse(
    readFileSync(path.join(FIXTURES, 'playwright-e2e-report.json'), 'utf8')
  );
  const { cases, summary } = parsePlaywrightJson(report);

  assert.equal(summary.passed, 1);
  assert.equal(summary.passedAfterRetry, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.failed, 1);
  assert.equal(cases.length, 4);
  assert.equal(
    cases.find(c => c.title.includes('flaky login'))?.status,
    'passedAfterRetry'
  );
});

test('buildComment matches PR summary layout', () => {
  const report = JSON.parse(
    readFileSync(path.join(FIXTURES, 'playwright-e2e-report.json'), 'utf8')
  );
  const parsed = parsePlaywrightJson(report);
  const body = buildComment({
    ...parsed,
    webUrl: 'https://deploy.example.com/pr-42/',
    runUrl: 'https://github.com/org/repo/actions/runs/1',
  });

  assert.match(body, new RegExp(`^${MARKER}`));
  assert.match(body, /# End 2 End - Test Results/);
  assert.match(body, /\| ✅ Passed \| 1 \|/);
  assert.match(body, /\| ☑️ Passed after retry \| 1 \|/);
  assert.match(body, /🌐 Domain: https:\/\/deploy\.example\.com\/pr-42\//);
  assert.match(body, /### auth\/login\.spec\.ts/);
  assert.match(body, /passed after retry/);
});

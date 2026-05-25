import assert from 'node:assert/strict';
import test from 'node:test';

import { mergePlaywrightJsonReports } from '../ci/merge-playwright-json-reports.mjs';

test('mergePlaywrightJsonReports combines suites and stats', () => {
  const merged = mergePlaywrightJsonReports([
    {
      config: { rootDir: '/a' },
      suites: [{ title: 'auth', file: 'auth/login.spec.ts', specs: [] }],
      stats: {
        duration: 1000,
        expected: 1,
        unexpected: 0,
        flaky: 0,
        skipped: 0,
      },
    },
    {
      config: { rootDir: '/a' },
      suites: [{ title: 'billing', file: 'billing/plans.spec.ts', specs: [] }],
      stats: {
        duration: 2000,
        expected: 2,
        unexpected: 1,
        flaky: 0,
        skipped: 1,
      },
    },
  ]);

  assert.equal(merged.suites.length, 2);
  assert.equal(merged.stats.duration, 3000);
  assert.equal(merged.stats.expected, 3);
  assert.equal(merged.stats.unexpected, 1);
  assert.equal(merged.stats.skipped, 1);
});

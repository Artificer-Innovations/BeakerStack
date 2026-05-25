import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  mergeHitMap,
  mergeBranchMap,
  mergeFileCoverage,
  mergeIstanbulCoverageReports,
} = require('../lib/merge-istanbul-coverage.js');
const { aggregateCoverageStats } = require('../lib/coverage-stats.js');

test('mergeHitMap keeps the higher hit count per statement', () => {
  assert.deepEqual(mergeHitMap({ 0: 0, 1: 2 }, { 0: 5, 1: 1 }), { 0: 5, 1: 2 });
});

test('mergeBranchMap combines multi-path branch hits with max()', () => {
  assert.deepEqual(mergeBranchMap({ 0: [1, 0] }, { 0: [0, 4], 1: [2, 0] }), {
    0: [1, 4],
    1: [2, 0],
  });
});

test('mergeFileCoverage unions neutral file coverage across runs', () => {
  const merged = mergeFileCoverage(
    {
      path: '/repo/packages/shared/src/theme/colors.ts',
      s: { 0: 0, 1: 0 },
      f: { 0: 0 },
      b: { 0: [0, 0] },
      statementMap: {
        0: { start: { line: 1 } },
        1: { start: { line: 2 } },
      },
    },
    {
      path: '/repo/packages/shared/src/theme/colors.ts',
      s: { 0: 3, 1: 1 },
      f: { 0: 2 },
      b: { 0: [1, 1] },
      statementMap: {
        0: { start: { line: 1 } },
        1: { start: { line: 2 } },
      },
    }
  );

  assert.deepEqual(merged.s, { 0: 3, 1: 1 });
  assert.deepEqual(merged.f, { 0: 2 });
  assert.deepEqual(merged.b, { 0: [1, 1] });
});

test('mergeFileCoverage preserves source maps when only one side defines them', () => {
  const merged = mergeFileCoverage(
    {
      s: { 0: 1 },
      f: { 0: 1 },
      b: { 0: [1, 0] },
      statementMap: { 0: { start: { line: 10 } } },
      fnMap: { 0: { name: 'render', line: 10 } },
      branchMap: { 0: { line: 11, type: 'if' } },
    },
    {
      s: { 0: 2 },
      f: { 0: 2 },
      b: { 0: [0, 1] },
    }
  );

  assert.deepEqual(merged.statementMap, { 0: { start: { line: 10 } } });
  assert.deepEqual(merged.fnMap, { 0: { name: 'render', line: 10 } });
  assert.deepEqual(merged.branchMap, { 0: { line: 11, type: 'if' } });
  assert.deepEqual(merged.s, { 0: 2 });
  assert.deepEqual(merged.b, { 0: [1, 1] });
});

test('mergeIstanbulCoverageReports keeps disjoint web and native files', () => {
  const merged = mergeIstanbulCoverageReports([
    {
      '/repo/Button.web.tsx': {
        s: { 0: 1 },
        f: { 0: 1 },
        b: {},
      },
      '/repo/colors.ts': {
        s: { 0: 0 },
        f: { 0: 0 },
        b: {},
      },
    },
    {
      '/repo/Button.native.tsx': {
        s: { 0: 1 },
        f: { 0: 1 },
        b: {},
      },
      '/repo/colors.ts': {
        s: { 0: 2 },
        f: { 0: 1 },
        b: {},
      },
    },
  ]);

  assert.equal(Object.keys(merged).length, 3);
  assert.equal(merged['/repo/Button.web.tsx'].s[0], 1);
  assert.equal(merged['/repo/Button.native.tsx'].s[0], 1);
  assert.equal(merged['/repo/colors.ts'].s[0], 2);

  const stats = aggregateCoverageStats(merged);
  assert.equal(stats.statements.total, 3);
  assert.equal(stats.statements.covered, 3);
});

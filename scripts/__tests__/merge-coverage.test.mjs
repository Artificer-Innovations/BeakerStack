import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  lineCoverageFromFile,
  branchCoverageFromFile,
  aggregateCoverageStats,
  pct,
} = require('../lib/coverage-stats.js');

test('lineCoverageFromFile uses native l map when present (Jest)', () => {
  const stats = lineCoverageFromFile({
    s: { 0: 1, 1: 0 },
    l: { 1: 1, 2: 0, 3: 5 },
  });

  assert.deepEqual(stats, { total: 3, covered: 2 });
});

test('lineCoverageFromFile derives from statementMap with non-sequential ids (Vitest v8)', () => {
  const stats = lineCoverageFromFile({
    s: { 1: 3, 9: 0, 10: 1, 11: 0 },
    statementMap: {
      1: { start: { line: 10 } },
      9: { start: { line: 11 } },
      10: { start: { line: 12 } },
      11: { start: { line: 13 } },
    },
  });

  assert.deepEqual(stats, { total: 4, covered: 2 });
});

test('lineCoverageFromFile marks a line covered when any statement on it hits', () => {
  const stats = lineCoverageFromFile({
    s: { a: 1, b: 0 },
    statementMap: {
      a: { start: { line: 4 } },
      b: { start: { line: 4 } },
    },
  });

  assert.deepEqual(stats, { total: 1, covered: 1 });
});

test('branchCoverageFromFile flattens multi-path branch hit arrays (Jest)', () => {
  const stats = branchCoverageFromFile({
    b: {
      0: [1, 0],
      1: [5, 5],
      2: [0, 0, 3],
    },
  });

  assert.deepEqual(stats, { total: 7, covered: 4 });
});

test('branchCoverageFromFile handles single-path branch arrays (Vitest v8)', () => {
  const stats = branchCoverageFromFile({
    b: {
      0: [2],
      1: [0],
    },
  });

  assert.deepEqual(stats, { total: 2, covered: 1 });
});

test('aggregateCoverageStats matches statement and line totals for sparse ids', () => {
  const stats = aggregateCoverageStats({
    'file.ts': {
      s: { 1: 1, 9: 0 },
      b: { 0: [1, 0] },
      f: { 0: 1 },
      statementMap: {
        1: { start: { line: 1 } },
        9: { start: { line: 2 } },
      },
    },
  });

  assert.equal(stats.statements.total, 2);
  assert.equal(stats.statements.covered, 1);
  assert.equal(stats.lines.total, 2);
  assert.equal(stats.lines.covered, 1);
  assert.equal(pct(stats.lines), 50);
});

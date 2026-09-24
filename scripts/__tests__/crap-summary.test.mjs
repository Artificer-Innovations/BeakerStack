import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DEFAULT_THRESHOLD,
  flattenCrapReport,
  buildCrapSummary,
  formatCrapCommentSection,
} = require('../lib/crap-summary.js');

const sampleReport = {
  '/repo/apps/web/src/risky.ts': {
    handleSubmit: {
      functionDescriptor: "function 'handleSubmit'",
      start: { line: 42, column: 0 },
      end: { line: 80, column: 1 },
      complexity: 12,
      statements: { covered: 2, total: 20, coverage: 0.1, crap: 128.4 },
    },
    helper: {
      functionDescriptor: "function 'helper'",
      start: { line: 10, column: 0 },
      complexity: 2,
      statements: { covered: 2, total: 2, coverage: 1, crap: 2 },
    },
  },
  '/repo/packages/billing/src/ok.ts': {
    charge: {
      functionDescriptor: "async function 'charge'",
      start: { line: 5, column: 0 },
      complexity: 8,
      statements: { covered: 1, total: 10, coverage: 0.1, crap: 45.5 },
    },
  },
};

test('flattenCrapReport sorts by CRAP descending and relativizes paths', () => {
  const entries = flattenCrapReport(sampleReport, { repoRoot: '/repo' });

  assert.equal(entries.length, 3);
  assert.equal(entries[0].name, 'handleSubmit');
  assert.equal(entries[0].file, 'apps/web/src/risky.ts');
  assert.equal(entries[0].crap, 128.4);
  assert.equal(entries[1].name, 'charge');
  assert.equal(entries[2].crap, 2);
});

test('buildCrapSummary filters by threshold and caps top N', () => {
  const entries = flattenCrapReport(sampleReport, { repoRoot: '/repo' });
  const summary = buildCrapSummary(entries, {
    threshold: DEFAULT_THRESHOLD,
    topN: 1,
  });

  assert.equal(summary.threshold, 30);
  assert.equal(summary.totalFunctions, 3);
  assert.equal(summary.aboveThreshold, 2);
  assert.equal(summary.top.length, 1);
  assert.equal(summary.top[0].name, 'handleSubmit');
  assert.equal(summary.top[0].complexity, 12);
});

test('buildCrapSummary with high threshold yields empty top list', () => {
  const entries = flattenCrapReport(sampleReport, { repoRoot: '/repo' });
  const summary = buildCrapSummary(entries, { threshold: 200, topN: 10 });

  assert.equal(summary.aboveThreshold, 0);
  assert.deepEqual(summary.top, []);
});

test('formatCrapCommentSection renders table for offenders', () => {
  const summary = buildCrapSummary(
    flattenCrapReport(sampleReport, { repoRoot: '/repo' }),
    { threshold: 30, topN: 10 }
  );
  const text = formatCrapCommentSection(summary).join('\n');

  assert.match(text, /CRAP analysis/);
  assert.match(text, /Functions with CRAP ≥ 30: \*\*2\*\* of 3/);
  assert.match(text, /handleSubmit/);
  assert.match(text, /apps\/web\/src\/risky\.ts:42/);
});

test('formatCrapCommentSection handles no offenders and missing summary', () => {
  const clean = formatCrapCommentSection({
    threshold: 30,
    totalFunctions: 5,
    aboveThreshold: 0,
    top: [],
  }).join('\n');
  assert.match(clean, /No functions above CRAP threshold 30/);

  const missing = formatCrapCommentSection(null).join('\n');
  assert.match(missing, /CRAP summary not available/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  normalizeIstanbulCoverage,
} = require('../lib/normalize-istanbul-coverage.js');

test('normalizeIstanbulCoverage fills omitted maps on all/empty stubs', () => {
  const normalized = normalizeIstanbulCoverage({
    '/repo/colors.ts': {
      path: '/repo/colors.ts',
      all: true,
      statementMap: { 0: { start: { line: 1 } } },
      s: { 0: 1 },
      f: {},
      b: {},
      l: { 1: 1 },
    },
  });

  const file = normalized['/repo/colors.ts'];
  assert.deepEqual(file.fnMap, {});
  assert.deepEqual(file.branchMap, {});
  assert.equal(file.path, '/repo/colors.ts');
  assert.deepEqual(file.statementMap, { 0: { start: { line: 1 } } });
});

test('normalizeIstanbulCoverage sets path from key when missing', () => {
  const normalized = normalizeIstanbulCoverage({
    '/repo/layout.ts': {
      statementMap: {},
      s: {},
      f: {},
      b: {},
    },
  });

  assert.equal(normalized['/repo/layout.ts'].path, '/repo/layout.ts');
  assert.deepEqual(normalized['/repo/layout.ts'].fnMap, {});
});

test('normalizeIstanbulCoverage skips null entries', () => {
  const normalized = normalizeIstanbulCoverage({
    '/repo/ok.ts': { path: '/repo/ok.ts', s: {}, f: {}, b: {} },
    '/repo/bad.ts': null,
  });

  assert.equal(Object.keys(normalized).length, 1);
  assert.ok(normalized['/repo/ok.ts']);
});

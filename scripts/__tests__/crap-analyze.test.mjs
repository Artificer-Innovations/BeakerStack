import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  crapScore,
  locationIsInRange,
  getCoverageForFunction,
  collectAstFunctions,
  matchAstFunction,
  buildCrapReport,
} = require('../lib/crap-analyze.js');

test('crapScore matches complexity² × (1 − coverage)³ + complexity', () => {
  assert.equal(crapScore({ complexity: 1, coverage: 1 }), 1);
  assert.equal(crapScore({ complexity: 5, coverage: 1 }), 5);
  assert.equal(crapScore({ complexity: 5, coverage: 0 }), 5 ** 2 + 5);
  assert.ok(crapScore({ complexity: 11, coverage: 0.45 }) > 30);
});

test('locationIsInRange handles line-only and column bounds', () => {
  const range = {
    start: { line: 10, column: 2 },
    end: { line: 12, column: 8 },
  };
  assert.equal(locationIsInRange({ line: 11 }, range), true);
  assert.equal(locationIsInRange({ line: 9 }, range), false);
  assert.equal(locationIsInRange({ line: 10, column: 1 }, range), false);
  assert.equal(locationIsInRange({ line: 10, column: 2 }, range), true);
});

test('getCoverageForFunction counts statements inside fn loc', () => {
  const fileCoverage = {
    fnMap: {
      0: {
        name: 'add',
        decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 3 } },
        loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
      },
    },
    statementMap: {
      0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      1: { start: { line: 2, column: 2 }, end: { line: 2, column: 10 } },
      2: { start: { line: 9, column: 0 }, end: { line: 9, column: 5 } },
    },
    s: { 0: 1, 1: 0, 2: 1 },
  };

  assert.deepEqual(getCoverageForFunction('0', fileCoverage), {
    covered: 1,
    total: 2,
  });
});

test('collectAstFunctions and matchAstFunction find nested complexity', () => {
  const source = `
export function risky(a: number, b: number) {
  if (a > 0) {
    return a && b ? a + b : b;
  }
  for (const x of [1, 2]) {
    if (x === a) return x;
  }
  return b;
}
`;
  const functions = collectAstFunctions('sample.ts', source);
  assert.ok(functions.length >= 1);
  const matched = matchAstFunction(
    { loc: { start: { line: 2 }, end: { line: 10 } }, name: 'risky' },
    functions
  );
  assert.ok(matched);
  assert.ok(matched.complexity >= 4);
  assert.match(matched.descriptor, /risky/);
});

test('buildCrapReport produces ranked entries from synthetic coverage', () => {
  const sourcePath = '/tmp/crap-analyze-sample.ts';
  const fs = require('fs');
  fs.writeFileSync(
    sourcePath,
    `
export function simple() { return 1; }
export function complex(a: number) {
  if (a > 0) return a;
  if (a < 0) return -a;
  return 0;
}
`
  );

  const coverage = {
    [sourcePath]: {
      path: sourcePath,
      fnMap: {
        0: {
          name: 'simple',
          decl: {
            start: { line: 2, column: 16 },
            end: { line: 2, column: 22 },
          },
          loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 40 } },
        },
        1: {
          name: 'complex',
          decl: {
            start: { line: 3, column: 16 },
            end: { line: 3, column: 23 },
          },
          loc: { start: { line: 3, column: 0 }, end: { line: 7, column: 1 } },
        },
      },
      statementMap: {
        0: { start: { line: 2, column: 0 }, end: { line: 2, column: 40 } },
        1: { start: { line: 4, column: 2 }, end: { line: 4, column: 20 } },
        2: { start: { line: 5, column: 2 }, end: { line: 5, column: 22 } },
        3: { start: { line: 6, column: 2 }, end: { line: 6, column: 12 } },
      },
      s: { 0: 1, 1: 0, 2: 0, 3: 0 },
      f: { 0: 1, 1: 0 },
      b: {},
    },
  };

  const report = buildCrapReport(coverage, { repoRoot: '/tmp' });
  const fileReport = report['crap-analyze-sample.ts'];
  assert.ok(fileReport);
  assert.ok(
    fileReport.complex.statements.crap > fileReport.simple.statements.crap
  );
});

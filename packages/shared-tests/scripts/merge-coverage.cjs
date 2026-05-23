#!/usr/bin/env node
/* eslint-disable no-console -- CLI */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  mergeIstanbulCoverageReports,
} = require('../../../scripts/lib/merge-istanbul-coverage.js');
const {
  aggregateCoverageStats,
  pct,
} = require('../../../scripts/lib/coverage-stats.js');

const packageRoot = path.resolve(__dirname, '..');
const coverageRoot = path.join(packageRoot, 'coverage');
const inputs = [
  { name: 'web', file: path.join(coverageRoot, 'web', 'coverage-final.json') },
  {
    name: 'native',
    file: path.join(coverageRoot, 'native', 'coverage-final.json'),
  },
];
const outputFile = path.join(coverageRoot, 'coverage-final.json');

/** @type {Record<string, Record<string, unknown>>[]} */
const reports = [];

for (const { name, file } of inputs) {
  if (!fs.existsSync(file)) {
    console.error(
      `Missing ${name} coverage at ${path.relative(packageRoot, file)}. Run test:coverage:${name} first.`
    );
    process.exit(1);
  }

  try {
    reports.push(JSON.parse(fs.readFileSync(file, 'utf8')));
    console.log(`✓ Loaded ${name} coverage`);
  } catch (error) {
    console.error(`Failed to read ${name} coverage from ${file}:`, error);
    process.exit(1);
  }
}

const merged = mergeIstanbulCoverageReports(reports);
fs.mkdirSync(coverageRoot, { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(merged, null, 2)}\n`);

const stats = aggregateCoverageStats(merged);
const webFiles = Object.keys(merged).filter(file =>
  /\.web\.(tsx|ts)$/.test(file)
);
const nativeFiles = Object.keys(merged).filter(file =>
  /\.native\.(tsx|ts)$/.test(file)
);

console.log(
  `✓ Wrote merged shared coverage to ${path.relative(packageRoot, outputFile)}`
);
console.log(
  `  files: ${Object.keys(merged).length} total (${webFiles.length} web, ${nativeFiles.length} native)`
);
console.log(
  `  statements: ${pct(stats.statements).toFixed(2)}% | branches: ${pct(stats.branches).toFixed(2)}% | functions: ${pct(stats.functions).toFixed(2)}% | lines: ${pct(stats.lines).toFixed(2)}%`
);

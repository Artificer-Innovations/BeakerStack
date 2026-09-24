#!/usr/bin/env node
/**
 * Enforce the CRAP (Change Risk Anti-Patterns) ceiling. Unlike
 * `crap-report.mjs` (report-only, always exits 0), this gate FAILS the build
 * when any function's CRAP strictly exceeds the threshold.
 *
 * Reads the full report written by `crap-report.mjs`
 * (coverage/crap-report/crap-report.json), so run that first (it runs as part
 * of `test:coverage:merge` / the CI merge step).
 *
 * Fails closed: if the report is missing, the gate errors rather than passing
 * silently — a gate that can't see the data must not green-light the build.
 *
 * Usage:
 *   node scripts/crap-gate.mjs
 *   node scripts/crap-gate.mjs --report coverage/crap-report/crap-report.json --threshold 16
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const {
  DEFAULT_THRESHOLD,
  flattenCrapReport,
  findCrapViolations,
} = require('./lib/crap-summary.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const args = process.argv.slice(2);
let reportPath = path.join(
  repoRoot,
  'coverage',
  'crap-report',
  'crap-report.json'
);
let threshold = DEFAULT_THRESHOLD;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--report':
      reportPath = path.resolve(args[++i]);
      break;
    case '--threshold':
      threshold = Number.parseFloat(args[++i]);
      break;
    case '--help':
    case '-h':
      process.stdout.write(`Usage: node scripts/crap-gate.mjs [options]

Fails (exit 1) when any function's CRAP strictly exceeds the threshold.

Options:
  --report <path>    Full CRAP report JSON (default: coverage/crap-report/crap-report.json)
  --threshold <n>    Max allowed CRAP; fail on CRAP > n (default: ${DEFAULT_THRESHOLD})
`);
      process.exit(0);
      break;
    default:
      console.warn(`Unknown argument: ${args[i]}`);
  }
}

if (!fs.existsSync(reportPath)) {
  console.error(
    `✗ CRAP gate: report not found at ${path.relative(repoRoot, reportPath)}. ` +
      `Run \`node scripts/crap-report.mjs\` (or \`npm run test:coverage\`) first.`
  );
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const entries = flattenCrapReport(report, { repoRoot });
const violations = findCrapViolations(entries, threshold).sort(
  (a, b) => b.crap - a.crap
);

if (violations.length === 0) {
  console.log(
    `✓ CRAP gate passed: ${entries.length} functions analyzed, none above CRAP ${threshold}.`
  );
  process.exit(0);
}

console.error(
  `✗ CRAP gate failed: ${violations.length} function(s) exceed CRAP ${threshold}:\n`
);
for (const entry of violations) {
  const location = entry.line > 0 ? `${entry.file}:${entry.line}` : entry.file;
  const coveragePct = (entry.coverage * 100).toFixed(0);
  console.error(
    `  ${entry.crap.toFixed(1).padStart(7)}  cc=${String(entry.complexity).padStart(2)}  cov=${coveragePct.padStart(3)}%  ${entry.functionDescriptor} (${location})`
  );
}
console.error(
  `\nReduce complexity (or coverage) until every function is CRAP ≤ ${threshold}.`
);
process.exit(1);

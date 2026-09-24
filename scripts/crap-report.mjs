#!/usr/bin/env node
/**
 * Generate a report-only CRAP (Change Risk Anti-Patterns) analysis from merged
 * Istanbul coverage. Never fails the process based on scores.
 *
 * Usage:
 *   node scripts/crap-report.mjs
 *   node scripts/crap-report.mjs --coverage coverage/coverage-final.json
 *   node scripts/crap-report.mjs --threshold 30 --top 10
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const {
  DEFAULT_THRESHOLD,
  DEFAULT_TOP_N,
  flattenCrapReport,
  buildCrapSummary,
} = require('./lib/crap-summary.js');
const {
  normalizeIstanbulCoverage,
} = require('./lib/normalize-istanbul-coverage.js');
const { buildCrapReport, writeHtmlReport } = require('./lib/crap-analyze.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const args = process.argv.slice(2);

let coveragePath = path.join(repoRoot, 'coverage', 'coverage-final.json');
let reportDir = path.join(repoRoot, 'coverage', 'crap-report');
let summaryPath = path.join(repoRoot, 'coverage', 'crap-summary.json');
let threshold = DEFAULT_THRESHOLD;
let topN = DEFAULT_TOP_N;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--coverage':
      coveragePath = path.resolve(args[++i]);
      break;
    case '--report-dir':
      reportDir = path.resolve(args[++i]);
      break;
    case '--summary':
      summaryPath = path.resolve(args[++i]);
      break;
    case '--threshold':
      threshold = Number.parseFloat(args[++i]);
      break;
    case '--top':
      topN = Number.parseInt(args[++i], 10);
      break;
    case '--help':
    case '-h':
      process.stdout.write(`Usage: node scripts/crap-report.mjs [options]

Options:
  --coverage <path>   Istanbul coverage-final.json (default: coverage/coverage-final.json)
  --report-dir <dir>  Full CRAP JSON/HTML report directory (default: coverage/crap-report)
  --summary <path>    Slim summary JSON for CI (default: coverage/crap-summary.json)
  --threshold <n>     Highlight functions with CRAP >= n (default: ${DEFAULT_THRESHOLD})
  --top <n>           Max high-risk functions in slim summary (default: ${DEFAULT_TOP_N})

Report-only: always exits 0 when analysis completes.
`);
      process.exit(0);
      break;
    default:
      console.warn(`Unknown argument: ${arg}`);
  }
}

function main() {
  if (!fs.existsSync(coveragePath)) {
    console.warn(
      `⚠ CRAP analysis skipped: coverage file not found at ${path.relative(repoRoot, coveragePath)}`
    );
    const emptySummary = buildCrapSummary([], { threshold, topN });
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(emptySummary, null, 2));
    return;
  }

  fs.mkdirSync(reportDir, { recursive: true });
  const jsonReportFile = path.join(reportDir, 'crap-report.json');
  const htmlReportDir = path.join(reportDir, 'html');

  console.log(
    `Running CRAP analysis on ${path.relative(repoRoot, coveragePath)}…`
  );

  const rawCoverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const testCoverage = normalizeIstanbulCoverage(rawCoverage);
  const report = buildCrapReport(testCoverage, { repoRoot });

  fs.writeFileSync(jsonReportFile, JSON.stringify(report, null, 2));
  writeHtmlReport(report, htmlReportDir, { threshold });

  const entries = flattenCrapReport(report, { repoRoot });
  const summary = buildCrapSummary(entries, { threshold, topN });

  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log('\nCRAP Analysis Summary');
  console.log(`  Functions analyzed: ${summary.totalFunctions}`);
  console.log(`  CRAP ≥ ${threshold}: ${summary.aboveThreshold}`);
  console.log(`  Full report: ${path.relative(repoRoot, reportDir)}`);
  console.log(
    `  HTML report: ${path.relative(repoRoot, path.join(htmlReportDir, 'index.html'))}`
  );
  console.log(`  Slim summary: ${path.relative(repoRoot, summaryPath)}`);

  if (summary.aboveThreshold === 0) {
    console.log(`\n✓ No functions above CRAP threshold ${threshold}.`);
    return;
  }

  console.log(`\nHigh-risk functions (CRAP ≥ ${threshold}, top ${topN}):\n`);
  for (const entry of summary.top) {
    const location =
      entry.line > 0 ? `${entry.file}:${entry.line}` : entry.file;
    const coveragePct = (entry.coverage * 100).toFixed(0);
    console.log(
      `  ${entry.crap.toFixed(1).padStart(7)}  cc=${String(entry.complexity).padStart(2)}  cov=${coveragePct.padStart(3)}%  ${entry.functionDescriptor} (${location})`
    );
  }
  console.log('\n(Report-only — high CRAP scores do not fail the build.)');
}

try {
  main();
} catch (error) {
  console.error('CRAP analysis failed:', error);
  try {
    const emptySummary = buildCrapSummary([], { threshold, topN });
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(emptySummary, null, 2));
  } catch {
    // ignore secondary write failures
  }
  process.exitCode = 0;
}

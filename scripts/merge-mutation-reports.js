#!/usr/bin/env node
/**
 * Merge per-package Stryker JSON reports into one summary and HTML report.
 *
 * Reads packages/<pkg>/reports/mutation/mutation.json for each Vitest package
 * and writes reports/mutation/{mutation-summary.json,mutation.json,mutation.html}.
 */

const path = require('path');
const { writeMergedMutationReports } = require('./lib/merge-mutation-reports');

const repoRoot = path.join(__dirname, '..');
const result = writeMergedMutationReports({ repoRoot });

if (!result.written) {
  console.error(
    'No mutation JSON reports found. Run npm run test:mutation:<package> first.'
  );
  process.exitCode = 1;
} else {
  const { summary } = result;
  const score =
    summary.total.mutationScore === null
      ? 'n/a'
      : `${summary.total.mutationScore.toFixed(2)}%`;

  console.log('\nIntegrated mutation summary\n');
  console.log(
    `Overall: ${summary.total.totalDetected}/${summary.total.totalValid} detected (${score})`
  );
  console.log(
    `  killed ${summary.total.killed}, timeout ${summary.total.timeout}, survived ${summary.total.survived}, no coverage ${summary.total.noCoverage}`
  );

  console.log('\nBy package:');
  for (const [name, stats] of Object.entries(summary.byPackage)) {
    const pkgScore =
      stats.mutationScore === null
        ? 'n/a'
        : `${stats.mutationScore.toFixed(2)}%`;
    console.log(
      `  ${name}: ${stats.totalDetected}/${stats.totalValid} (${pkgScore})`
    );
  }

  if (result.missing.length > 0) {
    console.log(`\nSkipped (no mutation.json): ${result.missing.join(', ')}`);
  }

  console.log(`\nSummary: ${path.relative(repoRoot, result.summaryFile)}`);
  console.log(`HTML:    ${path.relative(repoRoot, result.htmlFile)}`);
}

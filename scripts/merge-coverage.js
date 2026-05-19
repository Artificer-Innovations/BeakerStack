#!/usr/bin/env node
/**
 * Merge coverage reports from multiple sources into a single integrated report
 * Combines coverage from:
 * - apps/web/coverage (Vitest)
 * - apps/mobile/coverage (Jest)
 * - packages/shared-tests/coverage (Jest)
 * - packages/billing/coverage (Vitest)
 * - packages/admin/coverage (Vitest)
 * - packages/waitlist/coverage (Vitest)
 * - packages/email/coverage (Vitest)
 */

const fs = require('fs');
const path = require('path');
const { aggregateCoverageStats, pct } = require('./lib/coverage-stats');

const coverageDirs = [
  { name: 'web', path: 'apps/web/coverage' },
  { name: 'mobile', path: 'apps/mobile/coverage' },
  { name: 'shared', path: 'packages/shared-tests/coverage' },
  { name: 'billing', path: 'packages/billing/coverage' },
  { name: 'admin', path: 'packages/admin/coverage' },
  { name: 'waitlist', path: 'packages/waitlist/coverage' },
  { name: 'email', path: 'packages/email/coverage' },
];

const outputDir = path.join(__dirname, '..', 'coverage');
const outputFile = path.join(outputDir, 'coverage-summary.json');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read coverage-final.json from each source
const coverageData = {};
const totalStats = {
  statements: { total: 0, covered: 0 },
  branches: { total: 0, covered: 0 },
  functions: { total: 0, covered: 0 },
  lines: { total: 0, covered: 0 },
};

coverageDirs.forEach(({ name, path: coveragePath }) => {
  const coverageFile = path.join(
    __dirname,
    '..',
    coveragePath,
    'coverage-final.json'
  );

  if (fs.existsSync(coverageFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      coverageData[name] = data;

      const packageStats = aggregateCoverageStats(data);
      for (const key of Object.keys(totalStats)) {
        totalStats[key].total += packageStats[key].total;
        totalStats[key].covered += packageStats[key].covered;
      }

      console.log(`✓ Loaded coverage from ${name}`);
    } catch (error) {
      console.warn(
        `⚠ Warning: Could not load coverage from ${name}:`,
        error.message
      );
    }
  } else {
    console.warn(
      `⚠ Warning: Coverage file not found for ${name}: ${coverageFile}`
    );
  }
});

const statementsPct = pct(totalStats.statements);
const branchesPct = pct(totalStats.branches);
const functionsPct = pct(totalStats.functions);
const linesPct = pct(totalStats.lines);

// Create summary
const summary = {
  total: {
    statements: { ...totalStats.statements, pct: statementsPct },
    branches: { ...totalStats.branches, pct: branchesPct },
    functions: { ...totalStats.functions, pct: functionsPct },
    lines: { ...totalStats.lines, pct: linesPct },
  },
  byPackage: {},
};

// Calculate per-package stats
Object.entries(coverageData).forEach(([name, data]) => {
  const packageStats = aggregateCoverageStats(data);

  summary.byPackage[name] = {
    statements: {
      ...packageStats.statements,
      pct: pct(packageStats.statements),
    },
    branches: { ...packageStats.branches, pct: pct(packageStats.branches) },
    functions: { ...packageStats.functions, pct: pct(packageStats.functions) },
    lines: { ...packageStats.lines, pct: pct(packageStats.lines) },
  };
});

// Write summary
fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));

// Print summary
console.log('\n📊 Integrated Coverage Summary\n');
console.log('Overall Coverage:');
console.log(
  `  Statements: ${totalStats.statements.covered}/${totalStats.statements.total} (${statementsPct.toFixed(2)}%)`
);
console.log(
  `  Branches:    ${totalStats.branches.covered}/${totalStats.branches.total} (${branchesPct.toFixed(2)}%)`
);
console.log(
  `  Functions:   ${totalStats.functions.covered}/${totalStats.functions.total} (${functionsPct.toFixed(2)}%)`
);
console.log(
  `  Lines:       ${totalStats.lines.covered}/${totalStats.lines.total} (${linesPct.toFixed(2)}%)`
);

console.log('\nBy Package:');
Object.entries(summary.byPackage).forEach(([name, stats]) => {
  console.log(`\n  ${name}:`);
  console.log(
    `    Statements: ${stats.statements.covered}/${stats.statements.total} (${stats.statements.pct.toFixed(2)}%)`
  );
  console.log(
    `    Branches:    ${stats.branches.covered}/${stats.branches.total} (${stats.branches.pct.toFixed(2)}%)`
  );
  console.log(
    `    Functions:   ${stats.functions.covered}/${stats.functions.total} (${stats.functions.pct.toFixed(2)}%)`
  );
  console.log(
    `    Lines:       ${stats.lines.covered}/${stats.lines.total} (${stats.lines.pct.toFixed(2)}%)`
  );
});

console.log(`\n✅ Coverage summary saved to: ${outputFile}`);
console.log(`\n📄 Individual reports available at:`);
coverageDirs.forEach(({ path: coveragePath }) => {
  const indexPath = path.join(coveragePath, 'index.html');
  const fullPath = path.join(__dirname, '..', indexPath);
  if (fs.existsSync(fullPath)) {
    console.log(`   - ${indexPath}`);
  }
});

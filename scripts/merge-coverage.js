#!/usr/bin/env node
/**
 * Merge coverage reports from multiple sources into a single integrated report
 * Combines coverage from:
 * - apps/web/coverage (Vitest)
 * - apps/mobile/coverage (Jest)
 * - packages/shared-tests/coverage (Jest)
 */

const fs = require('fs');
const path = require('path');

const coverageDirs = [
  { name: 'web', path: 'apps/web/coverage' },
  { name: 'mobile', path: 'apps/mobile/coverage' },
  { name: 'shared', path: 'packages/shared-tests/coverage' },
];

const outputDir = path.join(__dirname, '..', 'coverage');
const outputFile = path.join(outputDir, 'coverage-summary.json');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read coverage-final.json from each source
const coverageData = {};
let totalStatements = 0;
let totalBranches = 0;
let totalFunctions = 0;
let totalLines = 0;
let coveredStatements = 0;
let coveredBranches = 0;
let coveredFunctions = 0;
let coveredLines = 0;

coverageDirs.forEach(({ name, path: coveragePath }) => {
  const coverageFile = path.join(__dirname, '..', coveragePath, 'coverage-final.json');
  
  if (fs.existsSync(coverageFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      coverageData[name] = data;
      
      // Calculate totals
      Object.values(data).forEach((file) => {
        if (file && typeof file === 'object' && file.s) {
          totalStatements += Object.keys(file.s).length;
          totalBranches += Object.keys(file.b || {}).length;
          totalFunctions += Object.keys(file.f || {}).length;
          totalLines += Object.keys(file.statementMap || {}).length;
          
          coveredStatements += Object.values(file.s).filter(v => v > 0).length;
          coveredBranches += Object.values(file.b || {}).filter(v => v > 0).length;
          coveredFunctions += Object.values(file.f || {}).filter(v => v > 0).length;
          coveredLines += Object.values(file.statementMap || {})
            .map((_, i) => file.s[i] > 0 ? 1 : 0)
            .filter(v => v > 0).length;
        }
      });
      
      console.log(`✓ Loaded coverage from ${name}`);
    } catch (error) {
      console.warn(`⚠ Warning: Could not load coverage from ${name}:`, error.message);
    }
  } else {
    console.warn(`⚠ Warning: Coverage file not found for ${name}: ${coverageFile}`);
  }
});

// Calculate percentages
const statementsPct = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
const branchesPct = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;
const functionsPct = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;
const linesPct = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;

// Create summary
const summary = {
  total: {
    statements: { total: totalStatements, covered: coveredStatements, pct: statementsPct },
    branches: { total: totalBranches, covered: coveredBranches, pct: branchesPct },
    functions: { total: totalFunctions, covered: coveredFunctions, pct: functionsPct },
    lines: { total: totalLines, covered: coveredLines, pct: linesPct },
  },
  byPackage: {},
};

// Calculate per-package stats
Object.entries(coverageData).forEach(([name, data]) => {
  let pkgStatements = 0;
  let pkgBranches = 0;
  let pkgFunctions = 0;
  let pkgLines = 0;
  let pkgCoveredStatements = 0;
  let pkgCoveredBranches = 0;
  let pkgCoveredFunctions = 0;
  let pkgCoveredLines = 0;
  
  Object.values(data).forEach((file) => {
    if (file && typeof file === 'object' && file.s) {
      pkgStatements += Object.keys(file.s).length;
      pkgBranches += Object.keys(file.b || {}).length;
      pkgFunctions += Object.keys(file.f || {}).length;
      pkgLines += Object.keys(file.statementMap || {}).length;
      
      pkgCoveredStatements += Object.values(file.s).filter(v => v > 0).length;
      pkgCoveredBranches += Object.values(file.b || {}).filter(v => v > 0).length;
      pkgCoveredFunctions += Object.values(file.f || {}).filter(v => v > 0).length;
      pkgCoveredLines += Object.values(file.statementMap || {})
        .map((_, i) => file.s[i] > 0 ? 1 : 0)
        .filter(v => v > 0).length;
    }
  });
  
  summary.byPackage[name] = {
    statements: {
      total: pkgStatements,
      covered: pkgCoveredStatements,
      pct: pkgStatements > 0 ? (pkgCoveredStatements / pkgStatements) * 100 : 0,
    },
    branches: {
      total: pkgBranches,
      covered: pkgCoveredBranches,
      pct: pkgBranches > 0 ? (pkgCoveredBranches / pkgBranches) * 100 : 0,
    },
    functions: {
      total: pkgFunctions,
      covered: pkgCoveredFunctions,
      pct: pkgFunctions > 0 ? (pkgCoveredFunctions / pkgFunctions) * 100 : 0,
    },
    lines: {
      total: pkgLines,
      covered: pkgCoveredLines,
      pct: pkgLines > 0 ? (pkgCoveredLines / pkgLines) * 100 : 0,
    },
  };
});

// Write summary
fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));

// Print summary
console.log('\n📊 Integrated Coverage Summary\n');
console.log('Overall Coverage:');
console.log(`  Statements: ${coveredStatements}/${totalStatements} (${statementsPct.toFixed(2)}%)`);
console.log(`  Branches:    ${coveredBranches}/${totalBranches} (${branchesPct.toFixed(2)}%)`);
console.log(`  Functions:   ${coveredFunctions}/${totalFunctions} (${functionsPct.toFixed(2)}%)`);
console.log(`  Lines:       ${coveredLines}/${totalLines} (${linesPct.toFixed(2)}%)`);

console.log('\nBy Package:');
Object.entries(summary.byPackage).forEach(([name, stats]) => {
  console.log(`\n  ${name}:`);
  console.log(`    Statements: ${stats.statements.covered}/${stats.statements.total} (${stats.statements.pct.toFixed(2)}%)`);
  console.log(`    Branches:    ${stats.branches.covered}/${stats.branches.total} (${stats.branches.pct.toFixed(2)}%)`);
  console.log(`    Functions:   ${stats.functions.covered}/${stats.functions.total} (${stats.functions.pct.toFixed(2)}%)`);
  console.log(`    Lines:       ${stats.lines.covered}/${stats.lines.total} (${stats.lines.pct.toFixed(2)}%)`);
});

console.log(`\n✅ Coverage summary saved to: ${outputFile}`);
console.log(`\n📄 Individual reports available at:`);
coverageDirs.forEach(({ name, path: coveragePath }) => {
  const indexPath = path.join(coveragePath, 'index.html');
  const fullPath = path.join(__dirname, '..', indexPath);
  if (fs.existsSync(fullPath)) {
    console.log(`   - ${indexPath}`);
  }
});


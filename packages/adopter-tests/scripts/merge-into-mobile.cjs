#!/usr/bin/env node
/* eslint-disable no-console -- CLI */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  mergeIstanbulCoverageReports,
} = require('../../../scripts/lib/merge-istanbul-coverage.js');

const repoRoot = path.resolve(__dirname, '../../..');
const mobileCoverageFile = path.join(
  repoRoot,
  'apps/mobile/coverage/coverage-final.json'
);
const adopterCoverageFile = path.join(
  __dirname,
  '../coverage/mobile/coverage-final.json'
);

if (!fs.existsSync(mobileCoverageFile)) {
  console.error(
    `Missing mobile coverage at ${path.relative(repoRoot, mobileCoverageFile)}. Run apps/mobile test:coverage first.`
  );
  process.exit(1);
}

if (!fs.existsSync(adopterCoverageFile)) {
  console.error(
    `Missing adopter mobile coverage at ${path.relative(repoRoot, adopterCoverageFile)}. Run adopter-tests test:coverage:mobile first.`
  );
  process.exit(1);
}

const mobileCoverage = JSON.parse(fs.readFileSync(mobileCoverageFile, 'utf8'));
const adopterCoverage = JSON.parse(
  fs.readFileSync(adopterCoverageFile, 'utf8')
);
const merged = mergeIstanbulCoverageReports([mobileCoverage, adopterCoverage]);

fs.writeFileSync(mobileCoverageFile, `${JSON.stringify(merged, null, 2)}\n`);

const adopterFiles = Object.keys(merged).filter(file =>
  file.includes(`${path.sep}adopter${path.sep}mobile${path.sep}`)
);

console.log(
  `✓ Merged adopter mobile coverage into ${path.relative(repoRoot, mobileCoverageFile)}`
);
console.log(`  adopter/mobile files in report: ${adopterFiles.length}`);

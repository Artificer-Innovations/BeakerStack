#!/usr/bin/env node

/**
 * Conditionally apply mobile-specific patch-package fixes.
 * Skips patches when the target module is not present (e.g., Linux CI builds).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const mobileRoot = path.join(__dirname, '..');
const patchesDir = path.join(mobileRoot, 'patches');
const projectRoot = path.join(mobileRoot, '..', '..');

if (!fs.existsSync(patchesDir)) {
  process.exit(0);
}

const patchFiles = fs
  .readdirSync(patchesDir)
  .filter(file => file.endsWith('.patch'));

if (patchFiles.length === 0) {
  process.exit(0);
}

const candidateNodeModules = [
  path.join(mobileRoot, 'node_modules'),
  path.join(mobileRoot, '..', 'node_modules'),
  path.join(mobileRoot, '..', '..', 'node_modules'),
].map(dir => path.resolve(dir));

const needsPatch = patchFiles.some(file => {
  const packageName = file.replace(/\.patch$/, '').replace(/\+[^+]+$/, '');
  return candidateNodeModules.some(nodeModulesDir =>
    fs.existsSync(path.join(nodeModulesDir, packageName))
  );
});

if (!needsPatch) {
  console.log(
    'Skipping patch-package: no patched dependencies installed in apps/mobile'
  );
  process.exit(0);
}

const relativePatchDir = path.relative(projectRoot, patchesDir);

const result = spawnSync(
  'npx',
  ['patch-package', '--patch-dir', relativePatchDir],
  {
    cwd: projectRoot,
    stdio: 'inherit',
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

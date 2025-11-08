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

if (!fs.existsSync(patchesDir)) {
  process.exit(0);
}

const patchFiles = fs
  .readdirSync(patchesDir)
  .filter(file => file.endsWith('.patch'));

if (patchFiles.length === 0) {
  process.exit(0);
}

const needsPatch = patchFiles.some(file => {
  const packageName = file.replace(/\.patch$/, '').replace(/\+[^+]+$/, '');
  const moduleDir = path.join(mobileRoot, 'node_modules', packageName);
  return fs.existsSync(moduleDir);
});

if (!needsPatch) {
  console.log(
    'Skipping patch-package: no patched dependencies installed in apps/mobile'
  );
  process.exit(0);
}

const result = spawnSync('npx', ['patch-package'], {
  cwd: mobileRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

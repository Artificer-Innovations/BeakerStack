#!/usr/bin/env node

/**
 * Conditionally apply mobile-specific patch-package fixes.
 * Skips patches when the target module is not present (e.g., Linux CI builds).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Determine the correct paths based on where we're running from
// This script can be called from:
// 1. apps/mobile/ (normal case)
// 2. Root of monorepo (during EAS builds)
// 3. apps/mobile/scripts/ (if called directly)

const scriptDir = __dirname;
let mobileRoot, patchesDir, projectRoot;

// Check if we're in apps/mobile/scripts/
if (
  scriptDir.endsWith('apps/mobile/scripts') ||
  scriptDir.endsWith('apps\\mobile\\scripts')
) {
  mobileRoot = path.join(scriptDir, '..');
  patchesDir = path.join(mobileRoot, 'patches');
  projectRoot = path.join(mobileRoot, '..', '..');
} else if (
  scriptDir.endsWith('apps/mobile') ||
  scriptDir.endsWith('apps\\mobile')
) {
  // Called from apps/mobile/
  mobileRoot = scriptDir;
  patchesDir = path.join(mobileRoot, 'patches');
  projectRoot = path.join(mobileRoot, '..');
} else {
  // Assume we're at the root, try to find apps/mobile
  mobileRoot = path.join(scriptDir, 'apps', 'mobile');
  patchesDir = path.join(mobileRoot, 'patches');
  projectRoot = scriptDir;
}

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
  // Don't log during EAS builds to avoid noise
  if (process.env.EAS_BUILD !== 'true') {
    console.log(
      'Skipping patch-package: no patched dependencies installed in apps/mobile'
    );
  }
  process.exit(0);
}

// Try to find the correct project root by looking for node_modules
// During EAS builds, the structure might be different
let actualProjectRoot = projectRoot;
if (!fs.existsSync(path.join(projectRoot, 'node_modules'))) {
  // Try parent directories
  let current = projectRoot;
  for (let i = 0; i < 3; i++) {
    current = path.join(current, '..');
    if (fs.existsSync(path.join(current, 'node_modules'))) {
      actualProjectRoot = path.resolve(current);
      break;
    }
  }
}

const relativePatchDir = path.relative(actualProjectRoot, patchesDir);

// Log for debugging during builds
if (process.env.EAS_BUILD === 'true' || process.env.CI) {
  console.log(`[apply-patches] Project root: ${actualProjectRoot}`);
  console.log(`[apply-patches] Patches dir: ${patchesDir}`);
  console.log(`[apply-patches] Relative patch dir: ${relativePatchDir}`);
}

const result = spawnSync(
  'npx',
  ['patch-package', '--patch-dir', relativePatchDir, '--error-on-fail'],
  {
    cwd: actualProjectRoot,
    stdio: 'inherit',
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

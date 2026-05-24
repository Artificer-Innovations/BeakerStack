#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const checks = [
  {
    name: '.gitattributes adopter merge=ours',
    ok: () =>
      readFileSync(path.join(repoRoot, '.gitattributes'), 'utf8').includes(
        'adopter/** merge=ours'
      ),
  },
  {
    name: 'adopter/config/index.ts exists',
    ok: () => existsSync(path.join(repoRoot, 'adopter/config/index.ts')),
  },
  {
    name: 'configureAdopter runtime exists',
    ok: () =>
      existsSync(
        path.join(repoRoot, 'packages/shared/src/config/adopterRuntime.ts')
      ),
  },
  {
    name: 'legacy adopter path lint script exists',
    ok: () =>
      existsSync(
        path.join(repoRoot, 'scripts/check-no-legacy-adopter-paths.mjs')
      ),
  },
];

let failed = false;
for (const check of checks) {
  if (!check.ok()) {
    console.error(`upgrade:check failed — ${check.name}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('upgrade:check passed');
process.exit(0);

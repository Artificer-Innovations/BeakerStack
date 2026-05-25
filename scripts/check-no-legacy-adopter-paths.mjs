#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const LEGACY_PATHS = [
  'apps/web/src/config/landing.ts',
  'apps/web/src/config/landing.example.alt.ts',
  'apps/web/src/billing/beakerstackBillingConfig.ts',
  'apps/web/src/waitlist/beakerstackWaitlistConfig.ts',
  'apps/web/src/pages/DashboardPage.tsx',
  'apps/mobile/src/billing/beakerstackBillingConfig.ts',
  'apps/mobile/src/screens/DashboardScreen.tsx',
  'packages/shared/src/config/branding.ts',
  'packages/shared/src/config/legal.ts',
];

const found = LEGACY_PATHS.filter(relative =>
  existsSync(path.join(repoRoot, relative))
);

assert.deepEqual(
  found,
  [],
  `Legacy adopter paths still present:\n${found.map(p => `  - ${p}`).join('\n')}\nMove to adopter/ and remove re-exports.`
);

console.log('check-no-legacy-adopter-paths: ok');

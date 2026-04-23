#!/usr/bin/env node
/**
 * Debug helper: reproduces TTY / stdio patterns used by setup-full when spawning teardown.
 *
 * Usage:
 *   node scripts/pr-preview/debug-teardown-stdio.mjs
 *   ./scripts/pr-preview/debug-teardown-stdio.mjs   (requires executable bit)
 *
 * - Test A: child bash with stdin = open(/dev/tty) (same pattern as runInteractiveOnControllingTty).
 * - Test B: teardown --dry-run + BEAKER_DELETE_BUCKETS_CONFIRM + stdin ignored (must exit 0 quickly).
 * - Test C: teardown --dry-run without env + stdin ignored (expect failure, must NOT hang).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, openSync, closeSync, constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const teardown = path.join(REPO_ROOT, 'scripts', 'pr-preview', 'teardown-preview-domain-buckets.sh');

console.log('--- Test A: child isatty(0) when stdio[0] is fd from open(/dev/tty) ---\n');
const ttyPath = '/dev/tty';
if (!existsSync(ttyPath)) {
  console.log('No /dev/tty file; skip A');
} else {
  let fd;
  try {
    fd = openSync(ttyPath, constants.O_RDWR);
  } catch (e) {
    console.log('Skip A (no controlling TTY in this environment):', (e && e.code) || e);
    fd = null;
  }
  if (fd != null) {
    try {
      const r = spawnSync(
        'bash',
        ['-c', 'if [[ -t 0 ]]; then echo "child: isatty(0)=yes"; else echo "child: isatty(0)=no"; fi'],
        { stdio: [fd, 'inherit', 'inherit'] },
      );
      console.log('exit code', r.status ?? 1);
    } finally {
      closeSync(fd);
    }
  }
}

console.log('\n--- Test B: teardown --dry-run + BEAKER_DELETE_BUCKETS_CONFIRM + stdin ignored ---\n');
const r2 = spawnSync('bash', [teardown, '--domain', 'example.com', '--region', 'us-east-1', '--dry-run'], {
  cwd: REPO_ROOT,
  env: { ...process.env, BEAKER_DELETE_BUCKETS_CONFIRM: 'PERMANENTLY DELETE BUCKETS' },
  stdio: ['ignore', 'inherit', 'inherit'],
});
console.log('exit code', r2.status ?? 1, '(expect 0)');

console.log('\n--- Test C: teardown --dry-run without env + stdin ignored (no prompt; should fail fast) ---\n');
const r3 = spawnSync('bash', [teardown, '--domain', 'example.com', '--region', 'us-east-1', '--dry-run'], {
  cwd: REPO_ROOT,
  env: { ...process.env },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const out = (r3.stdout || '').toString();
console.log('exit code', r3.status ?? 1, '(expect non-zero)');
if (out) console.log('stdout:', out.slice(0, 200));

if ((r2.status ?? 1) !== 0) {
  console.error('\nTest B failed: teardown should succeed with env confirm.');
  process.exit(1);
}
console.log('\nAll debug checks completed.');

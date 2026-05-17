#!/usr/bin/env node
/**
 * Entry point for npm run setup: choose local stack or full cloud bootstrap.
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import { openSync, ReadStream } from 'node:fs';
import url from 'node:url';
import path from 'node:path';

import { printIntroBanner } from './lib/setup-manual-instructions.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function ttyInputStream() {
  if (input.isTTY) return input;
  try {
    const fd = openSync('/dev/tty', 'r');
    return new ReadStream(undefined, { fd });
  } catch {
    return null;
  }
}

function logInfo(m) {
  if (m) console.log(`[setup] ${m}`);
  else console.log('');
}

function logWarn(m) {
  console.warn(`[setup] ${m}`);
}

async function main() {
  const inStream = ttyInputStream();
  let choice = '1';

  const logCtx = { logInfo, logWarn, repoRoot: REPO_ROOT };
  printIntroBanner(logCtx, { variant: 'menu' });

  if (inStream) {
    const rl = createInterface({ input: inStream, output });
    try {
      choice =
        (
          await rl.question(
            'Setup: (1) Local — dependencies, Supabase Docker, .env.local [default]  (2) Full cloud — remote resources, GitHub (read docs/setup-prep-checklist.md first)  (q) Quit: '
          )
        )
          .trim()
          .toLowerCase() || '1';
    } finally {
      rl.close();
    }
  } else {
    console.log(
      '[setup] No TTY; running local setup only. For cloud bootstrap run: npm run setup:full'
    );
  }

  if (
    choice === 'q' ||
    choice === 'quit' ||
    choice === 'exit' ||
    choice === 'x'
  ) {
    logInfo('Goodbye.');
    process.exit(0);
  }

  if (choice === '2') {
    const code = spawnSync(
      process.execPath,
      [path.join(__dirname, 'setup-full.mjs'), ...process.argv.slice(2)],
      {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      }
    );
    process.exit(code.status ?? 1);
  }

  const code = spawnSync('bash', [path.join(__dirname, 'setup-local.sh')], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  process.exit(code.status ?? 1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Interactive diagnostics for secret-line / TTY behavior (readline + masked read).
 *
 * Run in the same environment where `npm run setup:full` fails (e.g. Cursor terminal):
 *
 *   npm run setup:diagnose-secret-input
 *
 * Step 1: line-mode readline (press Enter once).
 * Step 2: masked read (characters should echo as * then Enter).
 *
 * If Step 2 exits or hangs before showing "masked>", compare output to Terminal.app.
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { existsSync, openSync } from 'node:fs';
import { platform } from 'node:os';
import { ReadStream as TtyReadStream } from 'node:tty';

import { readMaskedLineIfTty } from './lib/setup-secret-input.mjs';

async function main() {
  console.log('=== setup:diagnose-secret-input ===\n');
  console.log('pid', process.pid);
  console.log('node', process.version);
  console.log('stdin.isTTY', input.isTTY);
  console.log('stdout.isTTY', output.isTTY);
  console.log('TERM', process.env.TERM ?? '(unset)');
  console.log('TERM_PROGRAM', process.env.TERM_PROGRAM ?? '(unset)');
  console.log('CI', process.env.CI ?? '(unset)');

  if (platform() !== 'win32' && existsSync('/dev/tty')) {
    console.log('\n--- /dev/tty probe ---');
    try {
      const fd = openSync('/dev/tty', 'r');
      const rs = new TtyReadStream(fd);
      console.log('tty.ReadStream.isTTY', rs.isTTY, 'setRawMode', typeof rs.setRawMode);
      if (typeof rs.setRawMode !== 'function') {
        console.log('setRawMode: missing (wrong stream type)');
      } else {
        try {
          rs.setRawMode(true);
          console.log('setRawMode(true): ok');
        } catch (e) {
          console.log('setRawMode(true): threw', String(/** @type {Error} */ (e).message));
        }
        try {
          rs.setRawMode(false);
        } catch {
          /* ignore */
        }
      }
      rs.destroy();
    } catch (e) {
      console.log('open /dev/tty failed:', String(/** @type {Error} */ (e).message));
    }
  }

  const rl = createInterface({ input, output });

  console.log('\n--- Step 1: readline.question (line mode) ---');
  await rl.question('Type something or leave empty, then press Enter: ');
  console.log('Step 1 complete.\n');

  console.log('--- Step 2: readMaskedLineIfTty (raw /dev/tty path when not using __testRawSource) ---');
  const line = await readMaskedLineIfTty(rl, input, output, 'masked> (type secret chars, Enter to finish): ', {});
  console.log(
    '\nStep 2 complete. Result:',
    line === null ? 'null (fell back would use rl.question in setup-full)' : `string, length ${line.length}`,
  );

  rl.close();
  console.log('\n=== diagnostics finished ===');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

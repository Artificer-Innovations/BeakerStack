import { readFileSync, writeFileSync } from 'node:fs';
import {
  getWaitlistMode,
  setWaitlistMode,
  type SignupMode,
} from '../../utils/integration-fixtures';
import { e2eAuthDir } from './env';

type WaitlistModeSnapshot = {
  signup_mode: SignupMode;
};

const snapshotPath = `${e2eAuthDir}/waitlist-mode.snapshot.json`;

/** Capture current signup mode and force open for signup E2E specs. */
export async function prepareWaitlistModeForE2e(): Promise<void> {
  const current = (await getWaitlistMode()) ?? 'open';
  const snapshot: WaitlistModeSnapshot = { signup_mode: current };
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  if (current !== 'open') {
    await setWaitlistMode('open');
  }
}

/** Restore signup mode captured during global setup. */
export async function restoreWaitlistModeAfterE2e(): Promise<void> {
  let snapshot: WaitlistModeSnapshot;
  try {
    snapshot = JSON.parse(
      readFileSync(snapshotPath, 'utf8')
    ) as WaitlistModeSnapshot;
  } catch {
    return;
  }

  try {
    const current = (await getWaitlistMode()) ?? 'open';
    if (current !== snapshot.signup_mode) {
      await setWaitlistMode(snapshot.signup_mode);
    }
  } catch (error) {
    console.warn(
      `[e2e] Failed to restore waitlist signup mode: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

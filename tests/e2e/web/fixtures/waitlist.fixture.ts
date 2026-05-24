import {
  getWaitlistMode,
  setWaitlistMode,
  type SignupMode,
} from '../../../utils/integration-fixtures';

/** Set signup mode for a test block and restore afterward. */
export async function withSignupMode<T>(
  mode: SignupMode,
  fn: () => Promise<T>
): Promise<T> {
  const previous = (await getWaitlistMode()) ?? 'open';
  if (previous !== mode) {
    await setWaitlistMode(mode);
  }
  try {
    return await fn();
  } finally {
    const current = (await getWaitlistMode()) ?? 'open';
    if (current !== previous) {
      await setWaitlistMode(previous);
    }
  }
}

export async function setSignupModeForTests(
  mode: SignupMode
): Promise<SignupMode> {
  const previous = (await getWaitlistMode()) ?? 'open';
  if (previous !== mode) {
    await setWaitlistMode(mode);
  }
  return previous;
}

export async function restoreSignupMode(mode: SignupMode): Promise<void> {
  const current = (await getWaitlistMode()) ?? 'open';
  if (current !== mode) {
    await setWaitlistMode(mode);
  }
}

/** True when waitlist-capture / waitlist-ops edge functions are expected to work (preview CI). */
export function isWaitlistEdgeReady(): boolean {
  if (process.env.E2E_WAITLIST_READY === '1') {
    return true;
  }
  if (process.env.E2E_TARGET === 'preview' || process.env.CI === 'true') {
    return true;
  }
  return false;
}

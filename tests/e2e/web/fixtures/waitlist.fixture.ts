import { applyE2eSupabaseEnv } from '../env';
import {
  getWaitlistMode,
  setWaitlistMode,
  type SignupMode,
} from '../../../utils/integration-fixtures';
import { generateE2ETestEmail } from '../../../utils/test-emails';
import {
  deleteWaitlistEntry,
  deleteWaitlistEntryByEmail,
  findWaitlistEntryWithRetry,
} from './waitlist-data.fixture';

/** Set signup mode for a test block and restore afterward. */
export async function withSignupMode<T>(
  mode: SignupMode,
  fn: () => Promise<T>
): Promise<T> {
  // Application default when waitlist_settings row is missing is open (see supabase/seed.sql).
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

/** Whether this run should attempt waitlist edge probes (preview CI / explicit opt-in). */
export function isWaitlistEdgeReady(): boolean {
  if (process.env.E2E_WAITLIST_READY === '1') {
    return true;
  }
  if (process.env.E2E_TARGET === 'preview' || Boolean(process.env.CI)) {
    return true;
  }
  return false;
}

export type WaitlistEdgeProbeResult = {
  ready: boolean;
  reason: string;
};

function getWaitlistFunctionsBaseUrl(): string | null {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.PREVIEW_SUPABASE_URL;
  if (!supabaseUrl?.trim()) {
    return null;
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

async function cleanupWaitlistProbeCanary(
  canaryEmail: string,
  canaryEntryId: string | null
): Promise<void> {
  try {
    if (canaryEntryId) {
      await deleteWaitlistEntry(canaryEntryId);
      return;
    }
    await deleteWaitlistEntryByEmail(canaryEmail);
  } catch (error) {
    console.warn(
      `[e2e] waitlist probe canary cleanup failed (best-effort): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/** POST canary to waitlist-capture and validate waitlist-ops without using the browser. */
export async function probeWaitlistEdgeReady(): Promise<WaitlistEdgeProbeResult> {
  if (!isWaitlistEdgeReady()) {
    return {
      ready: false,
      reason:
        'Waitlist edge E2E disabled (set E2E_WAITLIST_READY=1 or run in CI/preview).',
    };
  }

  applyE2eSupabaseEnv();

  const base = getWaitlistFunctionsBaseUrl();
  if (!base) {
    return {
      ready: false,
      reason:
        'Waitlist edge probe missing SUPABASE_URL / PREVIEW_SUPABASE_URL.',
    };
  }

  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.PREVIEW_SUPABASE_ANON_KEY;
  if (!anonKey?.trim()) {
    return {
      ready: false,
      reason:
        'Waitlist edge probe missing SUPABASE_ANON_KEY / PREVIEW_SUPABASE_ANON_KEY.',
    };
  }

  const canaryEmail = generateE2ETestEmail();
  let canaryEntryId: string | null = null;

  try {
    const captureResponse = await fetch(`${base}/waitlist-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: canaryEmail,
        metadata: { source: 'e2e-waitlist-probe' },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const captureBody = await captureResponse.text();
    if (!captureResponse.ok) {
      return {
        ready: false,
        reason: `waitlist-capture probe failed (${captureResponse.status}): ${captureBody.slice(0, 300)}`,
      };
    }

    let capturePayload: { ok?: boolean } | null = null;
    try {
      capturePayload = JSON.parse(captureBody) as { ok?: boolean };
    } catch {
      return {
        ready: false,
        reason: `waitlist-capture probe returned non-JSON: ${captureBody.slice(0, 300)}`,
      };
    }
    if (!capturePayload?.ok) {
      return {
        ready: false,
        reason: `waitlist-capture probe returned ok=false: ${captureBody.slice(0, 300)}`,
      };
    }

    const entry = await findWaitlistEntryWithRetry(canaryEmail, 8, 250);
    canaryEntryId = entry?.id ?? null;

    let opsResponse: Response;
    try {
      opsResponse = await fetch(`${base}/waitlist-ops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          action: 'validate',
          token: 'e2e-waitlist-probe-invalid',
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      return {
        ready: false,
        reason: `waitlist-ops probe unreachable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    return {
      ready: true,
      reason: `waitlist-capture ok; waitlist-ops responded (${opsResponse.status}).`,
    };
  } catch (error) {
    return {
      ready: false,
      reason: `waitlist edge probe error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  } finally {
    await cleanupWaitlistProbeCanary(canaryEmail, canaryEntryId);
  }
}

let waitlistEdgeProbeCache: WaitlistEdgeProbeResult | undefined;

/** Memoized waitlist edge probe result for the current Playwright worker process. */
export async function resolveWaitlistEdgeReady(): Promise<WaitlistEdgeProbeResult> {
  if (waitlistEdgeProbeCache !== undefined) {
    return waitlistEdgeProbeCache;
  }
  waitlistEdgeProbeCache = await probeWaitlistEdgeReady();
  return waitlistEdgeProbeCache;
}

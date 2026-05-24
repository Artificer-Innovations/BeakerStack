import { applyE2eSupabaseEnv } from '../env';
import {
  findWaitlistEntryByEmail,
  getWaitlistMode,
  setWaitlistMode,
  type SignupMode,
} from '../../../utils/integration-fixtures';
import { createWebTestClient } from '../../../utils/test-clients';
import { deleteWaitlistEntry } from './waitlist-data.fixture';

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
  applyE2eSupabaseEnv();
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.PREVIEW_SUPABASE_URL;
  if (!supabaseUrl?.trim()) {
    return null;
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
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

  const base = getWaitlistFunctionsBaseUrl();
  if (!base) {
    return {
      ready: false,
      reason:
        'Waitlist edge probe missing SUPABASE_URL / PREVIEW_SUPABASE_URL.',
    };
  }

  const canaryEmail = `e2e-waitlist-probe-${Date.now()}@example.com`;

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

    const entry = await findWaitlistEntryByEmail(canaryEmail);
    if (entry) {
      await deleteWaitlistEntry(entry.id);
    }

    const client = createWebTestClient();
    const { data, error } = await client.functions.invoke('waitlist-ops', {
      body: { action: 'validate', token: 'e2e-waitlist-probe-invalid' },
    });
    if (error) {
      return {
        ready: false,
        reason: `waitlist-ops probe failed: ${error.message}`,
      };
    }
    if (typeof (data as { valid?: boolean })?.valid !== 'boolean') {
      return {
        ready: false,
        reason: `waitlist-ops probe returned unexpected payload: ${JSON.stringify(data).slice(0, 300)}`,
      };
    }

    return {
      ready: true,
      reason: 'waitlist-capture and waitlist-ops responded successfully.',
    };
  } catch (error) {
    return {
      ready: false,
      reason: `waitlist edge probe error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
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

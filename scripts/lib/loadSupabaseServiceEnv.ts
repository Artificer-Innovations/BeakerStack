/* eslint-disable no-console -- CLI helper */
import { execSync } from 'node:child_process';

/** Parse `supabase status -o env` lines like FOO="bar". */
export function parseSupabaseStatusEnv(stdout: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    const match = trimmed.match(/^([A-Z0-9_]+)="(.*)"$/);
    if (match) {
      out[match[1]!] = match[2]!;
    }
  }
  return out;
}

/**
 * Resolves Supabase URL + service role key for operator CLIs.
 * Uses env vars when set; otherwise reads local `supabase status -o env`.
 */
function stripQuotes(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadSupabaseServiceEnv(): { url: string; serviceKey: string } {
  let url = stripQuotes(process.env.SUPABASE_URL);
  let serviceKey = stripQuotes(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (url && serviceKey) {
    return { url, serviceKey };
  }

  try {
    const stdout = execSync('supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const fromStatus = parseSupabaseStatusEnv(stdout);
    url = url ?? fromStatus.API_URL ?? fromStatus.SUPABASE_URL;
    serviceKey = serviceKey ?? fromStatus.SERVICE_ROLE_KEY;
  } catch {
    // supabase not running or CLI missing — fall through to error below
  }

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or run `supabase start` locally.\n' +
        'Local example:\n' +
        '  eval "$(supabase status -o env)"\n' +
        '  export SUPABASE_URL="$API_URL"\n' +
        '  export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"'
    );
  }

  return { url, serviceKey };
}

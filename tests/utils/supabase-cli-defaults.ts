/**
 * Public Supabase CLI demo JWTs for local-only test workflows.
 *
 * The constants below are NOT secrets. They are the canonical,
 * documented JWTs that every `npx supabase start` instance emits:
 *
 *   - Header: `{"alg":"HS256","typ":"JWT"}`
 *   - Payload: `{"iss":"supabase-demo","role":"anon"|"service_role","exp":1983812996}`
 *   - Signing secret: `super-secret-jwt-token-with-at-least-32-characters-long`
 *     (the well-known default baked into the Supabase CLI source).
 *
 * Source of truth: https://github.com/supabase/cli (jwt secret + demo
 * token defaults emitted by `supabase status`). They cannot authenticate
 * against any cloud Supabase project because every cloud project uses a
 * unique signing secret.
 *
 * They are committed here so the test suite and CI can run with zero
 * configuration against a local `supabase start` instance. Production
 * code paths must never touch this file: any non-loopback Supabase URL
 * or `NODE_ENV=production` will trip the guard below.
 */

const LOOPBACK_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '0.0.0.0',
  '::1',
]);

/** Public Supabase CLI anon JWT. See file banner. */
export const LOCAL_SUPABASE_DEMO_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Public Supabase CLI service-role JWT. See file banner. */
export const LOCAL_SUPABASE_DEMO_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

function isLoopbackSupabaseUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    if (LOOPBACK_HOSTS.has(hostname)) return true;
    if (hostname.endsWith('.localhost')) return true;
    if (hostname.startsWith('supabase_internal_')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Refuses to use the demo keys outside a local environment.
 * Call this once per test client/session creation.
 */
export function assertLocalSupabaseEnvironment(supabaseUrl: string): void {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'Refusing to use Supabase CLI demo keys: NODE_ENV is "production". ' +
        'Set SUPABASE_URL and SUPABASE_ANON_KEY (and SUPABASE_SERVICE_ROLE_KEY if needed) explicitly.'
    );
  }

  if (!isLoopbackSupabaseUrl(supabaseUrl)) {
    throw new Error(
      `Refusing to use Supabase CLI demo keys against a non-local URL: ${supabaseUrl}. ` +
        'Set SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY in the environment to override.'
    );
  }
}

/**
 * Supabase hosted Google OAuth credentials for config.toml + CI config push.
 * Distinct from GOOGLE_SERVICES_* (Firebase / mobile native Sign-In).
 */

export const SUPABASE_GOOGLE_OAUTH_ENV_KEYS = [
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
];

/** GitHub secret names synced from .env.local (same names as env keys). */
export const SUPABASE_GOOGLE_OAUTH_GITHUB_SECRETS = new Set([
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
]);

export function printSupabaseGoogleOAuthGuidance(log = console.log) {
  log('');
  log('Supabase Google OAuth (web + hosted preview/staging/production):');
  log(
    '  • Create a **Web application** OAuth client in Google Cloud Console (APIs & Services → Credentials).'
  );
  log(
    '  • Authorized redirect URIs must include each Supabase project callback, e.g.'
  );
  log('      https://<project-ref>.supabase.co/auth/v1/callback');
  log(
    '  • Stored locally in .env.local and synced to GitHub for deploy config push.'
  );
  log(
    '  • GOOGLE_SERVICES_WEB_CLIENT_ID (Firebase) is often the same client ID, but Supabase also needs the **client secret** (not in google-services.json).'
  );
  log('  • See docs/OAUTH.md for local + hosted setup.');
  log('');
}

/**
 * @param {Record<string, string>} acc
 * @returns {boolean}
 */
export function hasSupabaseGoogleOAuthCredentials(acc) {
  const id = String(acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID ?? '').trim();
  const secret = String(acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET ?? '').trim();
  return Boolean(id && secret);
}

/**
 * @param {(line: string) => Promise<string>} promptSecret
 * @param {(q: string) => Promise<string>} question
 * @param {Record<string, string>} acc
 * @param {{ logInfo?: (m: string) => void; logWarn?: (m: string) => void; dryRun?: boolean }} opts
 */
export async function collectSupabaseGoogleOAuthIntoAcc(
  promptSecret,
  question,
  acc,
  opts = {}
) {
  const { logInfo = () => {}, logWarn = () => {}, dryRun = false } = opts;

  if (hasSupabaseGoogleOAuthCredentials(acc)) {
    logInfo(
      'Supabase Google OAuth credentials already present in session env (values not shown).'
    );
    return;
  }

  printSupabaseGoogleOAuthGuidance(logInfo);

  const skip = (
    await question(
      'Configure Supabase Google OAuth for hosted deploys now? (Y)es / (N)o skip [Y]: '
    )
  )
    .trim()
    .toLowerCase();
  if (skip === 'n' || skip === 'no') {
    logWarn(
      'Skipped Supabase Google OAuth — hosted Google sign-in will break on config push until these are set (see #326 / docs/OAUTH.md).'
    );
    return;
  }

  if (dryRun) {
    logInfo(
      '[dry-run] would prompt for SUPABASE_AUTH_EXTERNAL_GOOGLE_* (skipped).'
    );
    return;
  }

  const suggestedId = String(
    acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID ||
      acc.GOOGLE_SERVICES_WEB_CLIENT_ID ||
      ''
  ).trim();
  const idHint = suggestedId ? ` [${suggestedId.slice(0, 12)}…]` : '';
  const idRaw = (
    await question(
      `Google OAuth Web Client ID for Supabase${idHint} (Enter to ${suggestedId ? 'accept suggested' : 'skip'}): `
    )
  ).trim();
  const clientId = idRaw || suggestedId;
  if (!clientId) {
    logWarn('No client ID entered — skipping Supabase Google OAuth setup.');
    return;
  }
  acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = clientId;

  const secretRaw = await promptSecret(
    'Google OAuth Web Client Secret for Supabase (Enter to skip): '
  );
  if (!secretRaw?.trim()) {
    logWarn(
      'No client secret entered — remove partial client ID or re-run setup to finish OAuth setup.'
    );
    delete acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
    return;
  }
  acc.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = secretRaw.trim();
  logInfo('Stored Supabase Google OAuth credentials (values not printed).');
}

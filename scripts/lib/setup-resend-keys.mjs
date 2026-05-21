/**
 * Resend API key roles for setup:email / setup-full email-dns phase.
 *
 * - Setup (domain + DNS): full-access Resend API key (RESEND_API_KEY) — local only.
 * - SMTP + CI: send-only key in SMTP_PASS (local) and RESEND_SMTP_PASS (GitHub) — never sync RESEND_API_KEY.
 */

/** GitHub secret/variable names written after email setup. */
export const EMAIL_GITHUB_SYNC_NAMES = new Set([
  'RESEND_SMTP_PASS',
  'SMTP_ADMIN_EMAIL',
  'SMTP_SENDER_NAME',
]);

export function printResendKeyGuidance(log = console.log) {
  log('');
  log('Resend API keys — two roles:');
  log(
    '  1) Setup (this step): full-access key — create domains, DNS, verify sending domain.'
  );
  log(
    '     Stored locally as RESEND_API_KEY only. Do not use this key in GitHub Actions.'
  );
  log(
    '  2) SMTP + CI (after setup): send-only key — enough for Supabase SMTP and deploy workflows.'
  );
  log(
    '     Stored as SMTP_PASS in .env.local and RESEND_SMTP_PASS on GitHub (shared by all deploy workflows).'
  );
  log(
    '  CI sync does not need full-access. Rotate to send-only in Resend when setup finishes.'
  );
  log('');
}

/**
 * @param {Record<string, string>} acc
 * @param {Record<string, string>} smtpVars
 * @returns {Record<string, string>}
 */
export function assignEmailCiToAcc(acc, smtpVars) {
  const pass = String(smtpVars.SMTP_PASS ?? '').trim();
  const next = { ...acc, ...smtpVars };
  if (pass) {
    next.RESEND_SMTP_PASS = pass;
  }
  return next;
}

/**
 * @param {import('node:readline/promises').Interface} rl
 * @param {(line: string) => Promise<string>} promptSecret
 * @param {{ yes?: boolean; plainSecretPrompts?: boolean; setupKey: string; logInfo?: (m: string) => void; logWarn?: (m: string) => void; promptYesNo?: (rl: import('node:readline/promises').Interface, q: string, d: boolean) => Promise<boolean> }} opts
 * @returns {Promise<string>}
 */
export async function resolveSmtpPassForCi(rl, promptSecret, opts) {
  const {
    yes = false,
    plainSecretPrompts = false,
    setupKey,
    logInfo = () => {},
    logWarn = () => {},
    promptYesNo,
  } = opts;

  if (!setupKey) return '';

  if (yes) {
    logWarn(
      'Non-interactive mode: using the setup key for SMTP/CI. Create a send-only key in Resend and update GitHub secrets when you can.'
    );
    return setupKey;
  }

  logInfo(
    'For hosted Supabase + GitHub Actions, use a send-only Resend API key (Sending access).'
  );

  const useSeparate = promptYesNo
    ? await promptYesNo(
        rl,
        'Use a separate send-only API key for SMTP and GitHub CI? (recommended)',
        true
      )
    : true;

  if (useSeparate) {
    const sendKey = await promptSecret(
      rl,
      'Resend send-only API key for SMTP/CI (re_…): ',
      plainSecretPrompts
    );
    if (sendKey) return sendKey;
    logWarn('No send-only key entered; using setup key for SMTP/CI.');
  } else {
    logWarn(
      'Using the full-access setup key for SMTP/CI. Rotate to a send-only key in Resend and re-run the github phase.'
    );
  }
  return setupKey;
}

/**
 * @param {Record<string, string>} secrets
 * @param {Record<string, string>} variables
 */
export function pickEmailGithubPayload(secrets, variables) {
  /** @type {Record<string, string>} */
  const s = {};
  /** @type {Record<string, string>} */
  const v = {};
  for (const [name, value] of Object.entries(secrets)) {
    if (EMAIL_GITHUB_SYNC_NAMES.has(name) && value) s[name] = value;
  }
  for (const [name, value] of Object.entries(variables)) {
    if (EMAIL_GITHUB_SYNC_NAMES.has(name) && value) v[name] = value;
  }
  return { secrets: s, variables: v };
}

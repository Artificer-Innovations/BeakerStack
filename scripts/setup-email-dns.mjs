#!/usr/bin/env node
/**
 * Automate Resend domain setup with Route 53 DNS.
 * Can be run standalone or called as phaseEmailDns() from setup-full.mjs.
 *
 * Usage: node scripts/setup-email-dns.mjs [options]
 *   --domain=DOMAIN          Sending domain (e.g. auth.myapp.com)
 *   --hosted-zone-id=ID      Route 53 hosted zone ID (auto-discovered if omitted)
 *   --aws-profile=NAME       AWS CLI profile name
 *   --dmarc / --no-dmarc     Add DMARC record (prompted if omitted)
 *   --dmarc-email=EMAIL      DMARC rua address (defaults to SMTP_ADMIN_EMAIL)
 *   --yes                    Non-interactive; accept all defaults, skip verification poll
 *   --dry-run                Print planned actions without making any changes
 *   --plain-secret-prompts   Echo API key prompt in plain text (default: masked on TTY)
 *
 * Note: re-running this script merges SMTP_* keys into .env.local. Any user-written
 * comments in .env.local are removed on each merge (parseDotEnv strips comments).
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import {
  createOrGetResendDomain,
  verifyResendDomain,
} from './lib/setup-resend-api.mjs';
import { upsertEmailDnsRecords } from './lib/setup-route53-email-records.mjs';
import { detectRepoIdentity } from './lib/detect-repo-identity.mjs';
import {
  parseDotEnv,
  escapeDotEnvDoubleQuotedValue,
} from './lib/setup-dotenv.mjs';
import { readMaskedLineIfTty } from './lib/setup-secret-input.mjs';
import {
  assignEmailCiToAcc,
  pickEmailGithubPayload,
  printResendKeyGuidance,
  resolveSmtpPassForCi,
} from './lib/setup-resend-keys.mjs';
import {
  collectGithubSecretPayload,
  collectGithubVariablePayload,
} from './lib/setup-manifest.mjs';
import {
  confirmGithubRepoSyncTarget,
  resolveGhRepoContext,
} from './lib/setup-github-repo.mjs';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LOCAL_ENV_PATH = path.join(REPO_ROOT, '.env.local');
const CLOUD_ENV_PATH = path.join(REPO_ROOT, '.env.cloud.generated.local');
const CONFIG_TOML_PATH = path.join(REPO_ROOT, 'supabase', 'config.toml');

// ---------------------------------------------------------------------------
// Public API — called from setup-full.mjs phaseEmailDns
// ---------------------------------------------------------------------------

/**
 * @param {{ dryRun?: boolean; awsProfile?: string; plainSecretPrompts?: boolean; skipEmailDns?: boolean }} flags
 * @param {import('node:readline/promises').Interface} rl
 * @param {Record<string, string>} acc  accumulator shared with phaseWrite
 */
export async function phaseEmailDns(flags, rl, acc) {
  const dryRun = flags.dryRun ?? false;
  const awsProfileArgs = flags.awsProfile
    ? ['--profile', flags.awsProfile]
    : [];

  logInfo('Resend domain + Route 53 DNS setup');
  printResendKeyGuidance(logInfo);

  const setupKey = await ensureResendSetupKey(
    rl,
    flags.plainSecretPrompts ?? false,
    false
  );
  if (!setupKey) {
    logWarn('No Resend setup API key provided; skipping email DNS setup.');
    return;
  }

  const defaults = await loadEmailDnsDefaults(REPO_ROOT, {
    apexHint: await resolveApexHint(REPO_ROOT, acc.PR_PREVIEW_DOMAIN || ''),
  });
  for (const w of defaults.warnings) logWarn(w);

  const sendingDomain = await resolveSendingDomain(rl, defaults, '');

  if (!sendingDomain) {
    logWarn('No sending domain provided; skipping email DNS setup.');
    return;
  }

  const apex = apexFromDomain(sendingDomain);

  // Reuse zone ID from aws phase if available
  const hostedZoneId = acc.PR_PREVIEW_HOSTED_ZONE_ID || undefined;

  const defaultAdminEmail = `notifications@${sendingDomain}`;
  const adminEmail =
    (await rl.question(`Admin/sender email [${defaultAdminEmail}]: `)).trim() ||
    defaultAdminEmail;

  const senderName =
    (
      await rl.question(`Sender display name [${defaults.defaultSenderName}]: `)
    ).trim() || defaults.defaultSenderName;

  const addDmarc = await promptYesNo(
    rl,
    'Add DMARC TXT record? (recommended)',
    true
  );

  const { completed } = await runEmailDns({
    rl,
    sendingDomain,
    apex,
    hostedZoneId,
    dmarc: addDmarc,
    dmarcEmail: addDmarc ? adminEmail : undefined,
    awsProfileArgs,
    dryRun,
    nonInteractive: false,
    yes: false,
    skipEnvLocal: true, // phaseWrite handles .env.local via acc
  });

  if (completed) {
    const smtpPass = dryRun
      ? 'dry-run-smtp-pass'
      : await resolveSmtpPassForCi(rl, promptSecret, {
          yes: false,
          plainSecretPrompts: flags.plainSecretPrompts ?? false,
          setupKey,
          logInfo,
          logWarn,
          promptYesNo,
        });
    const smtpVars = buildSmtpVars(adminEmail, senderName, smtpPass);
    assignEmailCiToAcc(acc, smtpVars);
    if (!dryRun) {
      await applyConfigToml(false);
    }
    logInfo(
      'CI: RESEND_SMTP_PASS + SMTP_ADMIN_EMAIL / SMTP_SENDER_NAME sync in the github phase (send-only; never RESEND_API_KEY).'
    );
  }
}

// ---------------------------------------------------------------------------
// Standalone main
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const flags = parseArgv(argv);
  if (flags.skipEmailDns) {
    console.log('--skip-email-dns set; nothing to do.');
    process.exit(0);
  }

  const rl = createInterface({ input, output });
  try {
    printResendKeyGuidance(logInfo);
    const setupKey = await ensureResendSetupKey(
      rl,
      flags.plainSecretPrompts,
      flags.yes
    );
    if (!setupKey) {
      console.error('No Resend setup API key; exiting.');
      process.exit(1);
    }

    const envLocal = await readEnvFileIfExists(LOCAL_ENV_PATH);
    const cloudEnv = await readEnvFileIfExists(CLOUD_ENV_PATH);
    const defaults = await loadEmailDnsDefaults(REPO_ROOT, {
      apexHint: await resolveApexHint(
        REPO_ROOT,
        envLocal.PR_PREVIEW_DOMAIN || cloudEnv.PR_PREVIEW_DOMAIN || ''
      ),
    });
    for (const w of defaults.warnings) logWarn(w);

    const sendingDomain = await resolveSendingDomain(
      rl,
      defaults,
      flags.domain
    );
    const apex = apexFromDomain(sendingDomain);

    const defaultAdminEmail = `notifications@${sendingDomain}`;
    const adminEmail = flags.yes
      ? defaultAdminEmail
      : (
          await rl.question(`Admin/sender email [${defaultAdminEmail}]: `)
        ).trim() || defaultAdminEmail;

    const senderName = flags.yes
      ? defaults.defaultSenderName
      : (
          await rl.question(
            `Sender display name [${defaults.defaultSenderName}]: `
          )
        ).trim() || defaults.defaultSenderName;

    const addDmarc =
      flags.dmarc ??
      (flags.yes
        ? true
        : await promptYesNo(rl, 'Add DMARC TXT record? (recommended)', true));
    const dmarcEmail = flags.dmarcEmail || adminEmail;

    const { completed } = await runEmailDns({
      rl,
      sendingDomain,
      apex,
      hostedZoneId: flags.hostedZoneId || undefined,
      dmarc: addDmarc,
      dmarcEmail: addDmarc ? dmarcEmail : undefined,
      awsProfileArgs: flags.awsProfile ? ['--profile', flags.awsProfile] : [],
      dryRun: flags.dryRun,
      nonInteractive: flags.yes,
      yes: flags.yes,
      skipEnvLocal: true,
    });

    if (completed) {
      const smtpPass = await resolveSmtpPassForCi(rl, promptSecret, {
        yes: flags.yes,
        plainSecretPrompts: flags.plainSecretPrompts,
        setupKey,
        logInfo,
        logWarn,
        promptYesNo,
      });
      const smtpVars = buildSmtpVars(adminEmail, senderName, smtpPass);
      await finalizeEmailEnv({
        smtpVars,
        dryRun: flags.dryRun,
        skipEnvLocal: false,
      });
      /** @type {Record<string, string>} */
      const acc = assignEmailCiToAcc({}, smtpVars);
      if (!flags.skipGithub) {
        await syncEmailGithubSecrets({
          rl,
          acc,
          dryRun: flags.dryRun,
          repoOverride: flags.githubRepo,
        });
      }
    }
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Core orchestration
// Order:
//   1. Confirm before any API side effects
//   2. Create/reuse Resend domain → records[]
//   3. Plan Route 53 changes (dry-run, resolves zone once)
//   4. UPSERT Route 53 (reuses resolved zone ID — no second discovery)
//   5. Verify + poll (after DNS is written)
//   6. Write .env.local, config.toml (standalone only; setup-full uses phaseWrite)
//   7. Print completion
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<{ completed: boolean }>}
 */
async function runEmailDns({
  rl,
  sendingDomain,
  apex,
  hostedZoneId,
  dmarc,
  dmarcEmail,
  awsProfileArgs,
  dryRun,
  nonInteractive,
  yes,
  skipEnvLocal,
}) {
  // 1. Confirm before any API side effects (Resend domain creation is a real write)
  if (!yes && !dryRun && rl) {
    const proceed = await promptYesNo(
      rl,
      `Set up Resend sending domain "${sendingDomain}" + Route 53 DNS for ${apex}?`,
      true
    );
    if (!proceed) {
      logInfo('Aborted by user.');
      return { completed: false };
    }
  }

  // 2. Create/reuse Resend domain — get DNS records (no verify yet)
  logInfo(`Creating/reusing Resend domain: ${sendingDomain}`);
  const { domainId, records } = await createOrGetResendDomain(sendingDomain, {
    dryRun,
  });

  // 3. Plan Route 53 changes — zone is resolved once here and reused for the real UPSERT
  logInfo(`Planning Route 53 UPSERT for zone apex: ${apex}`);
  const planResult = await upsertEmailDnsRecords(records, {
    sendingDomain,
    apexDomain: apex,
    hostedZoneId,
    dmarc,
    dmarcEmail,
    awsProfileArgs,
    dryRun: true,
  });

  if (!dryRun) {
    console.log('\nPlanned DNS changes:');
    for (const c of planResult.records) {
      const rrs = c.ResourceRecordSet;
      console.log(`  UPSERT  ${rrs.Type.padEnd(5)}  ${rrs.Name}`);
    }
    console.log();
  }

  // 4. UPSERT Route 53 — pass resolved zone ID to avoid a second zone discovery call
  logInfo('Upserting DNS records in Route 53…');
  const { changeId, records: changes } = await upsertEmailDnsRecords(records, {
    sendingDomain,
    apexDomain: apex,
    hostedZoneId: planResult.resolvedZoneId,
    dmarc,
    dmarcEmail,
    awsProfileArgs,
    dryRun,
  });

  // 5. Trigger verification + poll (after DNS is written)
  logInfo('Triggering Resend domain verification…');
  const { verified } = await verifyResendDomain(domainId, {
    dryRun,
    nonInteractive: nonInteractive || yes,
  });

  // 6. config.toml (standalone merges .env.local after send-only key prompt)
  if (!skipEnvLocal) {
    logWarn(
      'skipEnvLocal=false without smtpPass in runEmailDns; caller should use finalizeEmailEnv().'
    );
  } else {
    await applyConfigToml(dryRun);
  }

  // 7. Completion summary
  printCompletion({
    sendingDomain,
    verified,
    changeId,
    changes,
    dmarc,
    dryRun,
  });
  return { completed: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSmtpVars(adminEmail, senderName, smtpPass) {
  return {
    SMTP_HOST: 'smtp.resend.com',
    SMTP_PORT: '587',
    SMTP_USER: 'resend',
    SMTP_PASS: smtpPass,
    SMTP_ADMIN_EMAIL: adminEmail,
    SMTP_SENDER_NAME: senderName,
  };
}

async function finalizeEmailEnv({ smtpVars, dryRun, skipEnvLocal }) {
  if (!skipEnvLocal) {
    await mergeEnvLocal(smtpVars, dryRun);
  }
  await applyConfigToml(dryRun);
}

/**
 * Full-access Resend key for domain/DNS API (local RESEND_API_KEY only).
 * @returns {Promise<string>}
 */
async function ensureResendSetupKey(rl, plainSecretPrompts, yes) {
  if (process.env.RESEND_API_KEY?.trim()) {
    return process.env.RESEND_API_KEY.trim();
  }
  if (yes) {
    console.error(
      'RESEND_API_KEY is not set. Export a full-access Resend API key before running with --yes.'
    );
    process.exit(1);
  }
  const key = await promptSecret(
    rl,
    'Resend API key — full access for domain setup (re_…): ',
    plainSecretPrompts
  );
  if (key) process.env.RESEND_API_KEY = key;
  return key;
}

function which(cmd) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(cmd)) return '';
  const r = spawnSync('sh', ['-c', `command -v "${cmd}" 2>/dev/null`], {
    encoding: 'utf8',
  });
  return r.status === 0 ? (r.stdout || '').trim().split('\n')[0] : '';
}

function ghAuthOk() {
  const r = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
  return r.status === 0;
}

function ghSecretSetSync(repo, name, value, dryRun) {
  if (dryRun) {
    logInfo(`[dry-run] gh secret set ${name} --repo ${repo}`);
    return 0;
  }
  const r = spawnSync('gh', ['secret', 'set', name, '--repo', repo], {
    input: value,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (r.status !== 0) {
    logWarn(`gh secret set ${name} failed.`);
  }
  return r.status ?? 1;
}

function ghVariableSetSync(repo, name, value, dryRun) {
  if (dryRun) {
    logInfo(`[dry-run] gh variable set ${name} --repo ${repo}`);
    return 0;
  }
  const r = spawnSync(
    'gh',
    ['variable', 'set', name, '--repo', repo, '--body', value],
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  if (r.status !== 0) {
    logWarn(`gh variable set ${name} failed.`);
  }
  return r.status ?? 1;
}

/**
 * @param {{ rl: import('node:readline/promises').Interface; acc: Record<string, string>; dryRun: boolean; repoOverride?: string }} opts
 */
async function syncEmailGithubSecrets({ rl, acc, dryRun, repoOverride = '' }) {
  if (!which('gh')) {
    logWarn(
      'GitHub CLI not found; skip secret sync. Run setup-full github phase or: gh secret set RESEND_SMTP_PASS …'
    );
    return;
  }
  if (!dryRun && !ghAuthOk()) {
    logWarn('gh auth login required to sync email secrets.');
    return;
  }

  const ghCtx = resolveGhRepoContext(REPO_ROOT, repoOverride);
  const repo = ghCtx.repo;
  if (!repo) {
    logWarn('Could not resolve GitHub repo for secret sync.');
    return;
  }

  const allSecrets = collectGithubSecretPayload(acc);
  const allVariables = collectGithubVariablePayload(acc);
  const { secrets, variables } = pickEmailGithubPayload(
    allSecrets,
    allVariables
  );
  const count = Object.keys(secrets).length + Object.keys(variables).length;
  if (count === 0) {
    logWarn('No email CI values to sync to GitHub.');
    return;
  }

  const proceed = await confirmGithubRepoSyncTarget(
    rl,
    { logInfo, logWarn },
    ghCtx,
    { dryRun, interactive: true, githubRepoOverride: Boolean(repoOverride) }
  );
  if (!proceed) {
    logInfo('Skipped GitHub email secret sync.');
    return;
  }

  for (const [name, value] of Object.entries(secrets)) {
    ghSecretSetSync(repo, name, value, dryRun);
    logInfo(
      dryRun
        ? `[dry-run] would set secret ${name}`
        : `GitHub secret set: ${name}`
    );
  }
  for (const [name, value] of Object.entries(variables)) {
    ghVariableSetSync(repo, name, value, dryRun);
    logInfo(
      dryRun
        ? `[dry-run] would set variable ${name}`
        : `GitHub variable set: ${name}`
    );
  }
}

async function readEnvFileIfExists(filePath) {
  try {
    return parseDotEnv(await fs.readFile(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function stringifyDotEnv(record) {
  const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
  const lines = ['# Generated by setup — do not commit', ''];
  for (const k of keys) {
    const v = record[k];
    if (v === undefined || v === null) continue;
    const needsQuote = /[\s#]/.test(String(v)) || v === '';
    lines.push(
      needsQuote
        ? `${k}="${escapeDotEnvDoubleQuotedValue(String(v))}"`
        : `${k}=${v}`
    );
  }
  lines.push('');
  return lines.join('\n');
}

async function mergeEnvLocal(smtpVars, dryRun) {
  if (dryRun) {
    logInfo(
      '[dry-run] would merge SMTP_* keys into .env.local (preserving all other keys; note: user-written comments are stripped)'
    );
    return;
  }
  const existing = await readEnvFileIfExists(LOCAL_ENV_PATH);
  const merged = { ...existing, ...smtpVars };
  try {
    await fs.writeFile(LOCAL_ENV_PATH, stringifyDotEnv(merged), 'utf8');
    logInfo(
      '.env.local: SMTP_* keys merged (other keys preserved; user-written comments stripped)'
    );
  } catch (err) {
    throw new Error(
      `Failed to write .env.local: ${err.message}\n` +
        'Check disk space and file permissions. SMTP keys were not saved.'
    );
  }
}

async function applyConfigToml(dryRun) {
  let toml;
  try {
    toml = await fs.readFile(CONFIG_TOML_PATH, 'utf8');
  } catch {
    logWarn(`Could not read ${CONFIG_TOML_PATH}; skipping config.toml update.`);
    return;
  }

  if (dryRun) {
    logInfo(
      '[dry-run] would uncomment [auth.email.smtp] block in supabase/config.toml'
    );
    return;
  }

  const updated = uncommentSmtpSection(toml);
  if (updated === toml) {
    logInfo(
      'supabase/config.toml: [auth.email.smtp] already enabled (no change)'
    );
    return;
  }
  try {
    await fs.writeFile(CONFIG_TOML_PATH, updated, 'utf8');
    logInfo('supabase/config.toml: [auth.email.smtp] block enabled');
  } catch (err) {
    throw new Error(
      `Failed to write supabase/config.toml: ${err.message}\n` +
        'Check disk space and file permissions. SMTP config was not applied to config.toml.'
    );
  }
}

/**
 * Uncomment the `# [auth.email.smtp]` block and replace placeholder values with Resend env-var refs.
 *
 * Matches an optional preceding prose comment line, the commented section header
 * `# [auth.email.smtp]`, plus all consecutive `# ` prefixed lines that follow
 * (bounded by blank line or next `[` header). Replaces the whole matched block
 * with a ready-to-use Resend SMTP config using env() references throughout.
 * Idempotent: returns toml unchanged if `# [auth.email.smtp]` is not present.
 *
 * @param {string} toml
 * @returns {string}
 */
export function uncommentSmtpSection(toml) {
  // Optional prose comment line immediately before the section header, then
  // the commented header + all following `# `-prefixed lines.
  const pattern = /(?:# [^\n]+\n)?# \[auth\.email\.smtp\]\n(# [^\n]*\n)*/;
  if (!pattern.test(toml)) return toml;

  const smtpBlock =
    '[auth.email.smtp]\n' +
    'enabled = true\n' +
    'host = "env(SMTP_HOST)"\n' +
    'port = 587\n' +
    'user = "env(SMTP_USER)"\n' +
    'pass = "env(SMTP_PASS)"\n' +
    'admin_email = "env(SMTP_ADMIN_EMAIL)"\n' +
    'sender_name = "env(SMTP_SENDER_NAME)"\n';

  return toml.replace(pattern, smtpBlock);
}

function apexFromDomain(domain) {
  const parts = domain.split('.');
  if (parts.length < 2) return domain;
  // Note: for two-part TLDs (e.g. .co.uk) this returns "co.uk" — pass --hosted-zone-id explicitly.
  return parts.slice(-2).join('.');
}

/**
 * Normalize apex or sending domain input (lowercase, no trailing dot).
 * @param {string} raw
 */
function normalizeDomainInput(raw) {
  return String(raw).trim().toLowerCase().replace(/\.+$/, '');
}

/**
 * Default transactional sending subdomain: auth.<apex> (matches setup-full / #284 guidance).
 * @param {string} apexOrDomain e.g. "beakerstack.com" or "auth.beakerstack.com"
 * @returns {string}
 */
export function defaultSendingDomain(apexOrDomain) {
  const d = normalizeDomainInput(apexOrDomain);
  if (!d) return '';
  if (d.startsWith('auth.')) return d;
  return `auth.${d}`;
}

/**
 * @param {string} displayName from packages/shared branding
 * @returns {string}
 */
export function senderDisplayNameFromBranding(displayName) {
  const name = String(displayName || 'Beaker Stack').trim() || 'Beaker Stack';
  return `${name} Notifications`;
}

/**
 * Apex for auth.<apex> defaults: PR_PREVIEW_DOMAIN from setup, else branding flatName + ".com".
 * @param {string} repoRoot
 * @param {string} explicitHint from acc / .env.local / .env.cloud.generated.local
 * @returns {Promise<string>}
 */
export async function resolveApexHint(repoRoot, explicitHint = '') {
  const fromSetup = normalizeDomainInput(explicitHint);
  if (fromSetup) return fromSetup;

  try {
    const text = await fs.readFile(
      path.join(repoRoot, 'packages', 'shared', 'src', 'config', 'branding.ts'),
      'utf8'
    );
    const m = text.match(/flatName:\s*['"]([^'"]+)['"]/);
    const flat = m?.[1]?.trim();
    if (flat) return `${flat}.com`;
  } catch {
    // fall through
  }
  return '';
}

/**
 * @param {string} repoRoot
 * @param {{ apexHint?: string }} opts
 */
async function loadEmailDnsDefaults(repoRoot, { apexHint = '' } = {}) {
  const identity = await detectRepoIdentity(repoRoot);
  const apex = await resolveApexHint(repoRoot, apexHint);
  return {
    defaultSendingDomain: defaultSendingDomain(apex),
    defaultSenderName: senderDisplayNameFromBranding(identity.displayName),
    warnings: identity.warnings,
  };
}

/**
 * @param {import('node:readline/promises').Interface} rl
 * @param {{ defaultSendingDomain: string; defaultSenderName: string }} defaults
 * @param {string} domainFlag from --domain=
 */
async function resolveSendingDomain(rl, defaults, domainFlag) {
  if (domainFlag) return defaultSendingDomain(domainFlag);

  const prompt = defaults.defaultSendingDomain
    ? `Sending domain [${defaults.defaultSendingDomain}]: `
    : 'Sending domain (e.g. auth.myapp.com): ';
  const answer = (await rl.question(prompt)).trim();
  const sendingDomain = answer || defaults.defaultSendingDomain;
  if (!sendingDomain) {
    console.error('No sending domain provided; exiting.');
    process.exit(1);
  }
  return sendingDomain;
}

async function promptSecret(rl, prompt, plain) {
  if (plain || !process.stdout.isTTY) {
    return (await rl.question(prompt)).trim();
  }
  const val = await readMaskedLineIfTty(rl, input, output, prompt);
  return (val ?? '').trim();
}

async function promptYesNo(rl, prompt, defaultYes) {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = (await rl.question(`${prompt} ${suffix}: `))
    .trim()
    .toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}

function printCompletion({
  sendingDomain,
  verified,
  changeId,
  changes,
  dmarc,
  dryRun,
}) {
  console.log('\n' + '─'.repeat(60));
  console.log(
    dryRun
      ? '[dry-run] Email DNS setup — planned actions:'
      : 'Email DNS setup complete:'
  );
  console.log(
    `  Resend domain: ${sendingDomain} — ${verified ? '✓ verified' : '⏳ verification pending'}`
  );
  if (!dryRun) {
    if (changeId !== 'dry-run') {
      console.log(`  Route 53 change batch: ${changeId}`);
    }
    if (changes.length > 0) {
      for (const c of changes) {
        const rrs = c.ResourceRecordSet;
        console.log(`    ${rrs.Type.padEnd(5)} ${rrs.Name}`);
      }
    }
  }
  if (!verified && !dryRun) {
    console.log('\n  ⏳ DNS propagation takes 10–60+ minutes.');
    console.log(
      '     Re-run `node scripts/setup-email-dns.mjs` to check verification status.'
    );
  }
  if (dmarc) {
    console.log(
      `\n  ⚠  DMARC record at _dmarc.${sendingDomain} — propagation up to 48h.`
    );
  }
  console.log(
    '\n  Hosted Supabase: deploy workflows run scripts/sync-supabase-auth-config.sh'
  );
  console.log('     when RESEND_SMTP_PASS is set on GitHub (send-only key).');
  console.log(
    '     Full-access RESEND_API_KEY stays local — do not add it to GitHub Actions.'
  );
  console.log('─'.repeat(60) + '\n');
}

function logInfo(msg) {
  console.log(`[setup:email-dns] ${msg}`);
}

function logWarn(msg) {
  console.warn(`[setup:email-dns] ⚠  ${msg}`);
}

function parseArgv(argv) {
  const flags = {
    domain: '',
    hostedZoneId: '',
    awsProfile: '',
    dmarc: undefined,
    dmarcEmail: '',
    yes: false,
    dryRun: false,
    skipEmailDns: false,
    plainSecretPrompts: false,
    skipGithub: false,
    githubRepo: '',
  };
  for (const a of argv) {
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--yes' || a === '-y') flags.yes = true;
    else if (a === '--dmarc') flags.dmarc = true;
    else if (a === '--no-dmarc') flags.dmarc = false;
    else if (a === '--skip-email-dns') flags.skipEmailDns = true;
    else if (a === '--skip-github') flags.skipGithub = true;
    else if (a === '--plain-secret-prompts') flags.plainSecretPrompts = true;
    else if (a.startsWith('--github-repo='))
      flags.githubRepo = a.slice('--github-repo='.length);
    else if (a.startsWith('--domain='))
      flags.domain = a.slice('--domain='.length);
    else if (a.startsWith('--hosted-zone-id='))
      flags.hostedZoneId = a.slice('--hosted-zone-id='.length);
    else if (a.startsWith('--aws-profile='))
      flags.awsProfile = a.slice('--aws-profile='.length);
    else if (a.startsWith('--dmarc-email='))
      flags.dmarcEmail = a.slice('--dmarc-email='.length);
  }
  return flags;
}

function printHelp() {
  console.log(`Usage: node scripts/setup-email-dns.mjs [options]

Options:
  --domain=DOMAIN          Sending domain (e.g. auth.myapp.com)
  --hosted-zone-id=ID      Route 53 hosted zone ID (auto-discovered if omitted;
                           required for two-part TLDs like .co.uk)
  --aws-profile=NAME       AWS CLI profile name
  --dmarc / --no-dmarc     Add DMARC record (prompted if omitted, default: yes)
  --dmarc-email=EMAIL      DMARC rua address (defaults to SMTP_ADMIN_EMAIL)
  --yes                    Non-interactive; use defaults and skip verification poll
  --dry-run                Print planned actions without making any changes
  --plain-secret-prompts   Echo API key prompt in plain text (default: masked on TTY)
  --skip-github            Do not run gh secret/variable sync after setup
  --github-repo=OWNER/NAME Override repo for gh sync (default: gh repo view)
  --help                   Show this message

Environment:
  RESEND_API_KEY           Full-access Resend key (setup only — not synced to GitHub)

Keys:
  Setup     Full-access Resend API key — domains/DNS (RESEND_API_KEY, local only).
  SMTP/CI   Send-only Resend API key — SMTP_PASS (.env.local) + RESEND_SMTP_PASS (GitHub, all environments).

Note: re-running merges SMTP_* keys into .env.local. User-written comments
in .env.local are removed on each merge.
`);
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  main().catch(err => {
    console.error('[setup:email-dns] Fatal:', err.message ?? err);
    process.exit(1);
  });
}

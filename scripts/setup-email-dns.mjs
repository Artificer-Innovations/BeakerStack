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
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { createOrGetResendDomain, verifyResendDomain } from './lib/setup-resend-api.mjs';
import { upsertEmailDnsRecords } from './lib/setup-route53-email-records.mjs';
import { parseDotEnv, escapeDotEnvDoubleQuotedValue } from './lib/setup-dotenv.mjs';
import { readMaskedLineIfTty } from './lib/setup-secret-input.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LOCAL_ENV_PATH = path.join(REPO_ROOT, '.env.local');
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
  const awsProfileArgs = flags.awsProfile ? ['--profile', flags.awsProfile] : [];

  logInfo('Resend domain + Route 53 DNS setup');

  // Ensure RESEND_API_KEY
  if (!process.env.RESEND_API_KEY) {
    const key = await promptSecret(
      rl,
      'Resend API key (re_…): ',
      flags.plainSecretPrompts ?? false
    );
    if (!key) {
      logWarn('No Resend API key provided; skipping email DNS setup.');
      return;
    }
    process.env.RESEND_API_KEY = key;
  }

  const sendingDomain = (await rl.question('Sending domain (e.g. auth.myapp.com): ')).trim();
  if (!sendingDomain) {
    logWarn('No sending domain provided; skipping email DNS setup.');
    return;
  }

  const apex = apexFromDomain(sendingDomain);

  // Reuse zone ID from aws phase if available
  const hostedZoneId = acc.PR_PREVIEW_HOSTED_ZONE_ID || undefined;

  const defaultAdminEmail = `noreply@${sendingDomain}`;
  const adminEmail =
    (await rl.question(`Admin/sender email [${defaultAdminEmail}]: `)).trim() || defaultAdminEmail;

  const defaultSenderName = 'Notifications';
  const senderName =
    (await rl.question(`Sender display name [${defaultSenderName}]: `)).trim() || defaultSenderName;

  const addDmarc = await promptYesNo(rl, 'Add DMARC TXT record? (recommended)', true);

  await runEmailDns({
    rl,
    sendingDomain,
    apex,
    hostedZoneId,
    adminEmail,
    senderName,
    dmarc: addDmarc,
    dmarcEmail: addDmarc ? adminEmail : undefined,
    awsProfileArgs,
    dryRun,
    nonInteractive: false,
    yes: false,
  });

  // Merge SMTP keys into acc so phaseWrite picks them up
  Object.assign(acc, buildSmtpVars(sendingDomain, adminEmail, senderName));
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
    // Ensure RESEND_API_KEY
    if (!process.env.RESEND_API_KEY) {
      if (flags.yes) {
        console.error('RESEND_API_KEY is not set. Export it before running with --yes.');
        process.exit(1);
      }
      const key = await promptSecret(rl, 'Resend API key (re_…): ', flags.plainSecretPrompts);
      if (!key) {
        console.error('No Resend API key; exiting.');
        process.exit(1);
      }
      process.env.RESEND_API_KEY = key;
    }

    const sendingDomain = await resolveDomain(rl, flags);
    const apex = apexFromDomain(sendingDomain);

    const defaultAdminEmail = `noreply@${sendingDomain}`;
    const adminEmail = flags.yes
      ? defaultAdminEmail
      : (await rl.question(`Admin/sender email [${defaultAdminEmail}]: `)).trim() || defaultAdminEmail;

    const defaultSenderName = 'Notifications';
    const senderName = flags.yes
      ? defaultSenderName
      : (await rl.question(`Sender display name [${defaultSenderName}]: `)).trim() || defaultSenderName;

    const addDmarc =
      flags.dmarc ??
      (flags.yes ? true : await promptYesNo(rl, 'Add DMARC TXT record? (recommended)', true));
    const dmarcEmail = flags.dmarcEmail || adminEmail;

    await runEmailDns({
      rl,
      sendingDomain,
      apex,
      hostedZoneId: flags.hostedZoneId || undefined,
      adminEmail,
      senderName,
      dmarc: addDmarc,
      dmarcEmail: addDmarc ? dmarcEmail : undefined,
      awsProfileArgs: flags.awsProfile ? ['--profile', flags.awsProfile] : [],
      dryRun: flags.dryRun,
      nonInteractive: flags.yes,
      yes: flags.yes,
    });
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Core orchestration
// Correct order per issue spec:
//   1. Create/reuse Resend domain → records[]
//   2. Show plan + confirm
//   3. UPSERT Route 53
//   4. Verify + poll
//   5. Write .env.local, config.toml
//   6. Print completion
// ---------------------------------------------------------------------------

async function runEmailDns({
  rl,
  sendingDomain,
  apex,
  hostedZoneId,
  adminEmail,
  senderName,
  dmarc,
  dmarcEmail,
  awsProfileArgs,
  dryRun,
  nonInteractive,
  yes,
}) {
  // 1. Create/reuse Resend domain — get DNS records (no verify yet)
  logInfo(`Creating/reusing Resend domain: ${sendingDomain}`);
  const { domainId, records } = await createOrGetResendDomain(sendingDomain, { dryRun });

  // 2. Show planned Route 53 changes and confirm (unless --yes or --dry-run)
  logInfo(`Planning Route 53 UPSERT for zone apex: ${apex}`);
  const planResult = await upsertEmailDnsRecords(records, {
    sendingDomain,
    apexDomain: apex,
    hostedZoneId,
    dmarc,
    dmarcEmail,
    awsProfileArgs,
    dryRun: true, // always plan first
  });

  if (!yes && !dryRun && rl) {
    console.log('\nPlanned DNS changes:');
    for (const c of planResult.records) {
      const rrs = c.ResourceRecordSet;
      console.log(`  UPSERT  ${rrs.Type.padEnd(5)}  ${rrs.Name}`);
    }
    const answer = (await rl.question('\nProceed with Route 53 UPSERT? [Y/n]: ')).trim().toLowerCase();
    if (answer === 'n' || answer === 'no') {
      logInfo('Aborted by user.');
      return;
    }
  }

  // 3. UPSERT Route 53 (real or dry-run)
  logInfo('Upserting DNS records in Route 53…');
  const { changeId, records: changes } = await upsertEmailDnsRecords(records, {
    sendingDomain,
    apexDomain: apex,
    hostedZoneId,
    dmarc,
    dmarcEmail,
    awsProfileArgs,
    dryRun,
  });

  // 4. Trigger verification + poll (after DNS is written)
  logInfo('Triggering Resend domain verification…');
  const { verified } = await verifyResendDomain(domainId, {
    dryRun,
    nonInteractive: nonInteractive || yes,
  });

  // 5. Write .env.local (merge only SMTP keys) and uncomment config.toml
  const smtpVars = buildSmtpVars(sendingDomain, adminEmail, senderName);
  await mergeEnvLocal(smtpVars, dryRun);
  await applyConfigToml(dryRun);

  // 6. Completion summary
  printCompletion({ sendingDomain, verified, changeId, changes, dmarc, dryRun });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSmtpVars(sendingDomain, adminEmail, senderName) {
  return {
    SMTP_HOST: 'smtp.resend.com',
    SMTP_PORT: '587',
    SMTP_USER: 'resend',
    SMTP_PASS: process.env.RESEND_API_KEY ?? '',
    SMTP_ADMIN_EMAIL: adminEmail,
    SMTP_SENDER_NAME: senderName,
  };
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
    lines.push(needsQuote ? `${k}="${escapeDotEnvDoubleQuotedValue(String(v))}"` : `${k}=${v}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function mergeEnvLocal(smtpVars, dryRun) {
  if (dryRun) {
    logInfo('[dry-run] would merge SMTP_* keys into .env.local (preserving all other keys)');
    return;
  }
  const existing = await readEnvFileIfExists(LOCAL_ENV_PATH);
  const merged = { ...existing, ...smtpVars };
  try {
    await fs.writeFile(LOCAL_ENV_PATH, stringifyDotEnv(merged), 'utf8');
    logInfo('.env.local: SMTP_* keys merged (all other keys preserved)');
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
    logInfo('[dry-run] would uncomment [auth.email.smtp] block in supabase/config.toml');
    return;
  }

  const updated = uncommentSmtpSection(toml);
  if (updated === toml) {
    logInfo('supabase/config.toml: [auth.email.smtp] already enabled (no change)');
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
 * Uncomment the `# [auth.email.smtp]` block and replace placeholder values with Resend config.
 *
 * Matches the commented section header `# [auth.email.smtp]` plus all consecutive `# ` prefixed
 * lines that follow (bounded by blank line or next `[` header — Mei's section-bound constraint).
 * Replaces the whole matched block with a ready-to-use Resend SMTP config.
 * Idempotent: if the block is already uncommented (no `# [auth.email.smtp]` present), returns toml unchanged.
 *
 * @param {string} toml
 * @returns {string}
 */
export function uncommentSmtpSection(toml) {
  // Match: `# [auth.email.smtp]` line + all immediately following `# ` prefixed lines
  // Stops at blank line or next `[` header (both are not matched by `# [^\n]*`)
  const pattern = /# \[auth\.email\.smtp\]\n(# [^\n]*\n)*/;
  if (!pattern.test(toml)) return toml;

  const smtpBlock =
    '[auth.email.smtp]\n' +
    'enabled = true\n' +
    'host = "smtp.resend.com"\n' +
    'port = 587\n' +
    'user = "resend"\n' +
    'pass = "env(SMTP_PASS)"\n' +
    'admin_email = "env(SMTP_ADMIN_EMAIL)"\n' +
    'sender_name = "env(SMTP_SENDER_NAME)"\n';

  return toml.replace(pattern, smtpBlock);
}

function apexFromDomain(domain) {
  const parts = domain.split('.');
  if (parts.length < 2) return domain;
  return parts.slice(-2).join('.');
}

async function resolveDomain(rl, flags) {
  if (flags.domain) return flags.domain;
  const d = (await rl.question('Sending domain (e.g. auth.myapp.com): ')).trim();
  if (!d) {
    console.error('No sending domain provided; exiting.');
    process.exit(1);
  }
  return d;
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
  const answer = (await rl.question(`${prompt} ${suffix}: `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}

function printCompletion({ sendingDomain, verified, changeId, changes, dmarc, dryRun }) {
  console.log('\n' + '─'.repeat(60));
  console.log(dryRun ? '[dry-run] Email DNS setup — planned actions:' : 'Email DNS setup complete:');
  console.log(`  Resend domain: ${sendingDomain} — ${verified ? '✓ verified' : '⏳ verification pending'}`);
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
    console.log('     Re-run `node scripts/setup-email-dns.mjs` to check verification status.');
  }
  if (dmarc) {
    console.log(`\n  ⚠  DMARC record at _dmarc.${sendingDomain} — propagation up to 48h.`);
  }
  console.log('\n  ⚠  Hosted Supabase: enable Custom SMTP in Dashboard → Auth → Settings.');
  console.log('     (This step must be done manually in the Supabase web UI.)');
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
  };
  for (const a of argv) {
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--yes' || a === '-y') flags.yes = true;
    else if (a === '--dmarc') flags.dmarc = true;
    else if (a === '--no-dmarc') flags.dmarc = false;
    else if (a === '--skip-email-dns') flags.skipEmailDns = true;
    else if (a === '--plain-secret-prompts') flags.plainSecretPrompts = true;
    else if (a.startsWith('--domain=')) flags.domain = a.slice('--domain='.length);
    else if (a.startsWith('--hosted-zone-id=')) flags.hostedZoneId = a.slice('--hosted-zone-id='.length);
    else if (a.startsWith('--aws-profile=')) flags.awsProfile = a.slice('--aws-profile='.length);
    else if (a.startsWith('--dmarc-email=')) flags.dmarcEmail = a.slice('--dmarc-email='.length);
  }
  return flags;
}

function printHelp() {
  console.log(`Usage: node scripts/setup-email-dns.mjs [options]

Options:
  --domain=DOMAIN          Sending domain (e.g. auth.myapp.com)
  --hosted-zone-id=ID      Route 53 hosted zone ID (auto-discovered if omitted)
  --aws-profile=NAME       AWS CLI profile name
  --dmarc / --no-dmarc     Add DMARC record (prompted if omitted, default: yes)
  --dmarc-email=EMAIL      DMARC rua address (defaults to SMTP_ADMIN_EMAIL)
  --yes                    Non-interactive; use defaults and skip verification poll
  --dry-run                Print planned actions without making any changes
  --plain-secret-prompts   Echo API key prompt in plain text (default: masked on TTY)
  --help                   Show this message

Environment:
  RESEND_API_KEY           Resend API key — prompted interactively if not set
`);
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  main().catch(err => {
    console.error('[setup:email-dns] Fatal:', err.message ?? err);
    process.exit(1);
  });
}

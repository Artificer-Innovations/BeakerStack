#!/usr/bin/env node
/**
 * Kit (ConvertKit Creator API v4) marketing email setup.
 * Can be run standalone or called as phaseKit() from setup-full.mjs.
 *
 * Usage: node scripts/setup-kit.mjs [options]
 *   --dry-run              Print planned actions; no file writes or gh sync
 *   --yes / -y             Non-interactive; use existing env values only
 *   --plain-secret-prompts Echo secret prompts in plain text
 *   --skip-github          Do not run gh secret sync
 *   --skip-kit             No-op exit
 *   --github-repo=OWNER/NAME  Override repo for gh sync
 *   --help
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import {
  collectKitEnvKeys,
  KIT_ENV_KEYS,
  SETUP_KIT_SKIPPED_ENV,
} from './lib/setup-kit.mjs';
import {
  parseDotEnv,
  escapeDotEnvDoubleQuotedValue,
} from './lib/setup-dotenv.mjs';
import { readMaskedLineIfTty } from './lib/setup-secret-input.mjs';
import { collectGithubSecretPayload } from './lib/setup-manifest.mjs';
import {
  confirmGithubRepoSyncTarget,
  resolveGhRepoContext,
} from './lib/setup-github-repo.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LOCAL_ENV_PATH = path.join(REPO_ROOT, '.env.local');
const CLOUD_ENV_PATH = path.join(REPO_ROOT, '.env.cloud.generated.local');

/**
 * @param {Record<string, string>} acc
 * @param {Record<string, string>} allSecrets
 * @returns {Record<string, string>}
 */
export function pickKitGithubPayload(acc, allSecrets) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of KIT_ENV_KEYS) {
    const v = String(allSecrets[key] ?? acc[key] ?? '').trim();
    if (v) out[key] = v;
  }
  return out;
}

/**
 * @param {{ dryRun?: boolean; yes?: boolean; plainSecretPrompts?: boolean; skipKit?: boolean; skipGithub?: boolean; githubRepo?: string; standalone?: boolean }} flags
 * @param {import('node:readline/promises').Interface} rl
 * @param {Record<string, string>} acc
 * @param {{ question?: (q: string) => Promise<string>; readSecret?: (q: string) => Promise<string> }} [deps]
 */
export async function phaseKit(flags, rl, acc, deps = {}) {
  if (flags.skipKit) {
    acc[SETUP_KIT_SKIPPED_ENV] = 'true';
    logInfo('Skipping Kit phase (--skip-kit).');
    return;
  }

  acc[SETUP_KIT_SKIPPED_ENV] = 'false';

  const question = deps.question ?? (q => rl.question(q));
  const readSecret =
    deps.readSecret ??
    (async prompt => {
      const masked = await readMaskedLineIfTty(rl, input, output, prompt);
      return masked ?? rl.question(prompt);
    });

  await collectKitEnvKeys(acc, {
    dryRun: flags.dryRun ?? false,
    yes: flags.yes ?? false,
    logInfo,
    logWarn,
    question,
    readSecret,
  });

  if (flags.standalone && !flags.dryRun && !flags.skipGithub) {
    await mergeKitEnvFiles(acc);
    await syncKitGithubSecrets({
      rl,
      acc,
      dryRun: flags.dryRun ?? false,
      repoOverride: flags.githubRepo ?? '',
    });
  }
}

async function readEnvFileIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return parseDotEnv(raw);
  } catch {
    return {};
  }
}

function mergeRecords(base, overlay) {
  return { ...base, ...overlay };
}

function stringifyDotEnv(obj) {
  return `${Object.entries(obj)
    .map(([k, v]) => `${k}="${escapeDotEnvDoubleQuotedValue(v)}"`)
    .join('\n')}\n`;
}

async function mergeKitEnvFiles(acc) {
  const kitOnly = /** @type {Record<string, string>} */ ({});
  for (const key of KIT_ENV_KEYS) {
    const v = String(acc[key] ?? '').trim();
    if (v) kitOnly[key] = v;
  }
  if (!Object.keys(kitOnly).length) return;

  const local = await readEnvFileIfExists(LOCAL_ENV_PATH);
  await fs.writeFile(
    LOCAL_ENV_PATH,
    stringifyDotEnv(mergeRecords(local, kitOnly)),
    'utf8'
  );
  logInfo(
    `Merged ${Object.keys(kitOnly).length} Kit key(s) into .env.local (values not shown).`
  );

  const cloud = await readEnvFileIfExists(CLOUD_ENV_PATH);
  await fs.writeFile(
    CLOUD_ENV_PATH,
    stringifyDotEnv(mergeRecords(cloud, kitOnly)),
    'utf8'
  );
  logInfo(
    `Merged Kit key(s) into .env.cloud.generated.local (values not shown).`
  );
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

/**
 * @param {{ rl: import('node:readline/promises').Interface; acc: Record<string, string>; dryRun: boolean; repoOverride?: string }} opts
 */
async function syncKitGithubSecrets({ rl, acc, dryRun, repoOverride = '' }) {
  if (!which('gh')) {
    logWarn(
      'GitHub CLI not found; skip secret sync. Run setup-full github phase or: gh secret set KIT_API_KEY …'
    );
    return;
  }
  if (!dryRun && !ghAuthOk()) {
    logWarn('gh auth login required to sync Kit secrets.');
    return;
  }

  const ghCtx = resolveGhRepoContext(REPO_ROOT, repoOverride);
  const repo = ghCtx.repo;
  if (!repo) {
    logWarn('Could not resolve GitHub repo for secret sync.');
    return;
  }

  const secrets = pickKitGithubPayload(acc, collectGithubSecretPayload(acc));
  if (!Object.keys(secrets).length) {
    logWarn('No Kit CI values to sync to GitHub.');
    return;
  }

  const proceed = await confirmGithubRepoSyncTarget(
    rl,
    { logInfo, logWarn },
    ghCtx,
    { dryRun, interactive: true, githubRepoOverride: Boolean(repoOverride) }
  );
  if (!proceed) {
    logInfo('Skipped GitHub Kit secret sync.');
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
}

function parseArgv(argv) {
  const flags = {
    dryRun: false,
    yes: false,
    plainSecretPrompts: false,
    skipGithub: false,
    skipKit: false,
    githubRepo: '',
    standalone: false,
  };
  for (const a of argv) {
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--yes' || a === '-y') flags.yes = true;
    else if (a === '--plain-secret-prompts') flags.plainSecretPrompts = true;
    else if (a === '--skip-github') flags.skipGithub = true;
    else if (a === '--skip-kit') flags.skipKit = true;
    else if (a.startsWith('--github-repo='))
      flags.githubRepo = a.slice('--github-repo='.length);
  }
  return flags;
}

function printHelp() {
  console.log(`Usage: node scripts/setup-kit.mjs [options]

Options:
  --dry-run              Print planned actions; no file writes or gh sync
  --yes / -y             Non-interactive; use existing env values only
  --plain-secret-prompts Echo secret prompts in plain text (default: masked on TTY)
  --skip-github          Do not run gh secret sync after setup
  --skip-kit             No-op exit
  --github-repo=OWNER/NAME  Override repo for gh sync (default: gh repo view)
  --help                 Show this message

Also runnable as setup:full kit phase:
  npm run setup:full -- --from=kit

Keys synced to GitHub (shared across preview, staging, production):
  KIT_API_KEY, KIT_CRON_SECRET, KIT_WEBHOOK_SECRET

Per-environment config (namespace, form ID, tier tags) is set in Admin → Marketing Email Settings.
`);
}

function logInfo(msg) {
  console.log(`[setup:kit] ${msg}`);
}

function logWarn(msg) {
  console.warn(`[setup:kit] ⚠  ${msg}`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const flags = { ...parseArgv(argv), standalone: true };
  if (flags.skipKit) {
    console.log('--skip-kit set; nothing to do.');
    process.exit(0);
  }

  const localEnv = await readEnvFileIfExists(LOCAL_ENV_PATH);
  const cloudEnv = await readEnvFileIfExists(CLOUD_ENV_PATH);
  /** @type {Record<string, string>} */
  const acc = { ...localEnv, ...cloudEnv };

  const rl = createInterface({ input, output });
  try {
    await phaseKit(flags, rl, acc);
  } finally {
    rl.close();
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  main().catch(err => {
    console.error('[setup:kit] Fatal:', err.message ?? err);
    process.exit(1);
  });
}

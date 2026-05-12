#!/usr/bin/env node
/**
 * Full interactive setup: remote resources, local gitignored env files, optional GitHub sync.
 * Never prints secret values (only key names and non-sensitive metadata).
 * Secret prompts: masked typing on a TTY (unless --plain-secret-prompts); paste/path to a bare secret
 * or allowlisted dotenv file (multi-line files require a path).
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  promises as fs,
  openSync,
  closeSync,
  existsSync,
  ReadStream,
  constants as fsConstants,
} from 'node:fs';
import { homedir, platform } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import url from 'node:url';

import {
  AWS_BOOTSTRAP_TO_ENV,
  collectGithubSecretPayload,
  collectGithubVariablePayload,
  listMissingRequiredGithubCiDetails,
  listMissingRequiredGithubForCi,
  mergeGithubSyncEnv,
  mergeableSetupEnvKeys,
  resolveSetupFromPhase,
  resolveValueForGithub,
  SETUP_FROM_PHASE_ALIASES,
} from './lib/setup-manifest.mjs';
import { escapeDotEnvDoubleQuotedValue, parseDotEnv } from './lib/setup-dotenv.mjs';
import { readMaskedLineIfTty, resolveSecretInputLine } from './lib/setup-secret-input.mjs';
import { envVarsFromGoogleServicesJson } from './lib/setup-google-services.mjs';
import {
  printIntroBanner,
  printPhaseIntro,
  confirmRunPhase,
  printManualInstructions,
  SetupQuit,
  isSetupQuit,
} from './lib/setup-manual-instructions.mjs';
import { clearExpoKeysFromAcc, ensureNonTemplateEasProject } from './lib/setup-expo-eas.mjs';
import {
  formatSupabaseProjectChoiceLine,
  parseApiKeysJson,
  parseOrgsListJson,
  parseProjectCreateJson,
  parseProjectsListJson,
  pickRecommendedSupabaseProject,
  postgresConnectionUri,
  projectApiUrl,
  runCmd,
} from './lib/setup-supabase.mjs';
import { buildNameVariants } from './rename-project.mjs';
import { detectRepoIdentity } from './lib/detect-repo-identity.mjs';
import {
  ACM_CLOUDFRONT_REGION,
  discoverIssuedCertsCoveringApexWildcard,
  discoverRoute53PublicZonesForApex,
} from './lib/setup-aws-discover.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const CLOUD_ENV_PATH = path.join(REPO_ROOT, '.env.cloud.generated.local');
const AWS_ENV_PATH = path.join(REPO_ROOT, '.env.aws.generated.local');
const LOCAL_ENV_PATH = path.join(REPO_ROOT, '.env.local');
const STATE_PATH = path.join(REPO_ROOT, '.setup-state.json');
const MOBILE_DIR = path.join(REPO_ROOT, 'apps', 'mobile');
const MOBILE_APP_CONFIG = path.join(MOBILE_DIR, 'app.config.js');

const PHASE_ORDER = ['prereqs', 'identity', 'supabase', 'aws', 'expo', 'google', 'write', 'github'];

/** Merged from dotenv-style secret files / pastes (allowlisted keys only). */
const MERGEABLE_SETUP_ENV_KEYS = mergeableSetupEnvKeys();

/** @typedef {{ dryRun: boolean; fromPhase: string; skipRename: boolean; awsProfile: string; skipGithub: boolean; mobileEnabled: boolean; plainSecretPrompts: boolean }} CliFlags */

function printHelp() {
  console.log(`Usage: node scripts/setup-full.mjs [options]

Options:
  --dry-run              No env/state file writes; no PAT/EXPO env merge; no Supabase api-keys fetch;
                         no AWS bootstrap run; no google-services import; GitHub sync skips gh but still
                         reads .env*.local to log what would be synced
  --from=PHASE           Resume at prereqs|identity|supabase|aws|expo|google|write|github (alias: gh=github;
                         merges existing .env*.local first when resuming)
  --skip-rename          Skip the identity / rename phase entirely
  --skip-github          Skip GitHub Actions secret/variable sync
  --skip-mobile          Skip Expo, EAS, and Google Services setup (web-only repos)
  --aws-profile=NAME     Pass through to bootstrap-aws-stack.sh
  --plain-secret-prompts Echo secret prompts in plain text (default: mask typed secrets on a TTY)

Secrets are written only to gitignored files; values are never printed.

Secret prompts accept: typed input (masked on a real TTY unless --plain-secret-prompts), a single-line
paste, or a path to a file. Files may be a bare secret body or dotenv-style KEY=value lines (multi-key
files require a path; interactive paste is one line only). Pasted secrets are still echoed by the terminal
before the app receives them — masking only hides typing.

Supabase CLI:
  Prefer SUPABASE_ACCESS_TOKEN or pasting a PAT when prompted (supabase login --token).
  Embedded IDE terminals often break line-oriented Supabase logins — use Terminal.app if needed.

Expo / EAS:
  If apps/mobile still points at the template EAS UUID, you can [l] link an existing project,
  [n] run eas init for a new project, or [s] skip. After [n], the new project id is read from
  apps/mobile/.eas/project.json (and app.config.js) when the CLI does not print a UUID.
  The script patches app.config.js and .eas/project.json so updates.url and extra.eas.projectId stay aligned.
  EXPO_TOKEN can be supplied via env, file path, or masked/plain prompt at the end of the Expo phase.

Other interactive CLIs (gh, aws, eas login) prefer the controlling TTY (/dev/tty) when available.
`);
}

function parseArgv(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  /** @type {CliFlags} */
  const flags = {
    dryRun: false,
    fromPhase: 'prereqs',
    skipRename: false,
    awsProfile: '',
    skipGithub: false,
    mobileEnabled: true,
    plainSecretPrompts: false,
  };
  for (const a of argv) {
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--skip-rename') flags.skipRename = true;
    else if (a === '--skip-github') flags.skipGithub = true;
    else if (a === '--skip-mobile') flags.mobileEnabled = false;
    else if (a === '--plain-secret-prompts') flags.plainSecretPrompts = true;
    else if (a.startsWith('--from=')) flags.fromPhase = resolveSetupFromPhase(a.slice('--from='.length));
    else if (a.startsWith('--aws-profile=')) flags.awsProfile = a.slice('--aws-profile='.length);
  }
  if (!PHASE_ORDER.includes(flags.fromPhase)) {
    const aliasHint = Object.entries(SETUP_FROM_PHASE_ALIASES)
      .map(([k, v]) => `${k}→${v}`)
      .join(', ');
    console.error(
      `Unknown --from=${flags.fromPhase}. Use one of: ${PHASE_ORDER.join(', ')}${aliasHint ? `; aliases: ${aliasHint}` : ''}`,
    );
    process.exit(1);
  }
  return flags;
}

export function redactForLog(message) {
  return String(message)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]')
    .replace(/postgresql:\/\/[^:]+:[^@]+@/g, 'postgresql://postgres:[redacted]@')
    .replace(/(api_key|apikey|secret|password|token)=([^\s&]+)/gi, '$1=[redacted]');
}

export function formatSetupLogMessage(msg) {
  return `[setup] ${redactForLog(msg)}`;
}

function logInfo(msg) {
  console.log(formatSetupLogMessage(msg));
}

function logWarn(msg) {
  console.warn(formatSetupLogMessage(msg));
}

/**
 * @param {Record<string, string>} acc
 */
function logMissingRequiredGithubForCi(acc) {
  const missing = listMissingRequiredGithubForCi(acc);
  if (!missing.length) return;
  logWarn(
    `Required GitHub secrets/variables still missing (${missing.length}): deploy/preview CI may fail until these are set in env files or on GitHub.`,
  );
  logWarn(
    'Use the exact variable names from docs/reference/github-actions-secrets.md (npm run docs:actions-secrets). Lines like export KEY=value in .env files are supported.',
  );
  /** @type {Map<string, { secrets: string[]; variables: string[] }>} */
  const byGroup = new Map();
  for (const m of missing) {
    if (!byGroup.has(m.group)) {
      byGroup.set(m.group, { secrets: [], variables: [] });
    }
    const bucket = byGroup.get(m.group);
    if (m.kind === 'secret') bucket.secrets.push(m.name);
    else bucket.variables.push(m.name);
  }
  const groups = [...byGroup.keys()].sort((a, b) => a.localeCompare(b));
  for (const g of groups) {
    const { secrets, variables } = byGroup.get(g);
    const parts = [];
    if (secrets.length) parts.push(`secrets: ${[...secrets].sort((a, b) => a.localeCompare(b)).join(', ')}`);
    if (variables.length) {
      parts.push(`variables: ${[...variables].sort((a, b) => a.localeCompare(b)).join(', ')}`);
    }
    logWarn(`  [${g}] ${parts.join(' | ')}`);
  }
}

/**
 * Node's readline `question()` rejects with AbortError on EOF (e.g. Ctrl+D on an empty line)
 * instead of resolving to "" — treat that as empty input so bracketed defaults still work.
 * @param {unknown} e
 */
function isReadlineQuestionAbortError(e) {
  return typeof e === 'object' && e !== null && /** @type {{ name?: string }} */ (e).name === 'AbortError';
}

/**
 * Readline prompt that treats bare `q` / `quit` / `exit` / `x` as exit entire setup.
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {string} prompt
 */
async function rlQuestion(rl, prompt) {
  /** @type {string} */
  let s;
  try {
    s = await rl.question(prompt);
  } catch (e) {
    if (isReadlineQuestionAbortError(e)) {
      s = '';
    } else {
      throw e;
    }
  }
  const a = String(s).trim().toLowerCase();
  if (a === 'q' || a === 'quit' || a === 'exit' || a === 'x') {
    throw new SetupQuit();
  }
  return s;
}

/**
 * @param {string} s
 */
function checkSecretInputQuit(s) {
  const a = String(s).trim().toLowerCase();
  if (a === 'q' || a === 'quit' || a === 'exit' || a === 'x') {
    throw new SetupQuit();
  }
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 * @param {CliFlags} flags
 * @param {string} prompt
 */
async function readSecretLineMaskedOrVisible(rl, promptInput, flags, prompt) {
  if (flags.plainSecretPrompts) {
    return (await rlQuestion(rl, prompt)).trim();
  }
  const masked = await readMaskedLineIfTty(rl, promptInput, output, prompt);
  if (masked === null) {
    return (await rlQuestion(rl, prompt)).trim();
  }
  return masked.trim();
}

/**
 * @param {Record<string, string>} acc
 * @param {{ merged: Record<string, string>; primary: string; ignoredKeys: string[] }} resolved
 * @param {string} primaryKey
 */
function applySecretResolutionToAcc(acc, resolved, primaryKey) {
  if (resolved.ignoredKeys.length) {
    const uniq = [...new Set(resolved.ignoredKeys)].sort();
    logInfo(`Secret input ignored unknown keys: ${uniq.join(', ')}`);
  }
  if (Object.keys(resolved.merged).length) {
    Object.assign(acc, resolved.merged);
    logInfo(`Merged from secret input: ${Object.keys(resolved.merged).sort().join(', ')}`);
  }
  if (!(primaryKey in resolved.merged) && resolved.primary) {
    acc[primaryKey] = resolved.primary;
  }
}

/** @param {'staging'|'production'|'preview'} tier */
function supabaseDbPasswordEnvKey(tier) {
  if (tier === 'preview') return 'SUPABASE_PREVIEW_DB_PASSWORD';
  if (tier === 'staging') return 'STAGING_SUPABASE_DB_PASSWORD';
  return 'PRODUCTION_SUPABASE_DB_PASSWORD';
}

/**
 * @param {string} line
 * @param {string} primaryKey
 */
async function resolveSecretInputForSetup(line, primaryKey) {
  return resolveSecretInputLine({
    line,
    primaryKey,
    allowKeys: MERGEABLE_SETUP_ENV_KEYS,
    homedir,
    repoRoot: REPO_ROOT,
    readFileUtf8: (p) => fs.readFile(p, 'utf8'),
  });
}

/**
 * Base string for `supabase projects create` default slugs, derived from the mobile app
 * display name (same token rules as npm run rename) or Expo slug, so renames yield e.g. poststack-staging.
 * @returns {Promise<string>} lowercase alnum segment, e.g. poststack or beakerstack
 */
async function readSupabaseProjectSlugBase() {
  try {
    const text = await fs.readFile(MOBILE_APP_CONFIG, 'utf8');
    const nameM = text.match(/\bname:\s*['"]([^'"]+)['"]/);
    if (nameM?.[1]) {
      try {
        return buildNameVariants(nameM[1]).flatLower;
      } catch {
        /* invalid name */
      }
    }
    const slugM = text.match(/\bslug:\s*['"]([a-z0-9_-]+)['"]/i);
    if (slugM?.[1]) {
      return slugM[1].replace(/-/g, '');
    }
  } catch {
    /* missing or unreadable app.config.js */
  }
  return 'beaker';
}

function stringifyDotEnv(record) {
  const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
  const lines = ['# Generated by npm run setup:full — do not commit', ''];
  for (const k of keys) {
    const v = record[k];
    if (v === undefined || v === null) continue;
    const needsQuote = /[\s#]/.test(v) || v === '';
    lines.push(
      needsQuote ? `${k}="${escapeDotEnvDoubleQuotedValue(v)}"` : `${k}=${v}`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * @param {string} filePath
 * @returns {Promise<Record<string, string>>}
 */
async function readEnvFileIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return parseDotEnv(raw);
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, string>} base
 * @param {Record<string, string>} patch
 */
function mergeRecords(base, patch) {
  return { ...base, ...patch };
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string; stdin?: string }} opts
 */
function runInteractive(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || REPO_ROOT,
    input: opts.stdin,
    stdio: opts.stdin ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    encoding: 'utf8',
    env: opts.env,
  });
  return res.status ?? 1;
}

/**
 * Run a subprocess with stdin/stdout/stderr attached to /dev/tty (fixes line-oriented CLIs under readline).
 * Falls back to inherited stdio on Windows or if /dev/tty is unavailable.
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 */
function runInteractiveOnControllingTty(cmd, args, opts = {}) {
  const cwd = opts.cwd || REPO_ROOT;
  if (platform() === 'win32') {
    return spawnSync(cmd, args, { cwd, stdio: 'inherit', encoding: 'utf8' }).status ?? 1;
  }
  const ttyPath = '/dev/tty';
  if (!existsSync(ttyPath)) {
    return spawnSync(cmd, args, { cwd, stdio: 'inherit', encoding: 'utf8' }).status ?? 1;
  }
  let fd;
  try {
    fd = openSync(ttyPath, fsConstants.O_RDWR);
  } catch {
    return spawnSync(cmd, args, { cwd, stdio: 'inherit', encoding: 'utf8' }).status ?? 1;
  }
  try {
    return spawnSync(cmd, args, {
      cwd,
      stdio: [fd, fd, fd],
      encoding: 'utf8',
    }).status ?? 1;
  } finally {
    closeSync(fd);
  }
}

/** Release stdin so browser/device logins can use the TTY. */
function pauseRl(rl) {
  if (rl && typeof rl.pause === 'function') {
    rl.pause();
  }
}

function resumeRl(rl) {
  if (rl && typeof rl.resume === 'function') {
    rl.resume();
  }
}

/**
 * Run a subprocess with inherited stdio (interactive). Pauses readline first.
 * @param {import('node:readline/promises').ReadLine | null} rl
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 */
function runInteractiveWithRl(rl, cmd, args, opts = {}) {
  pauseRl(rl);
  try {
    return runInteractiveOnControllingTty(cmd, args, { cwd: opts.cwd });
  } finally {
    resumeRl(rl);
  }
}

/**
 * @param {string} token
 */
function trySupabaseLoginFromEnvToken(token) {
  if (!token) return false;
  const r = spawnSync('supabase', ['login', '--token', token.trim()], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return r.status === 0;
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 * @param {Record<string, string>} acc
 * @param {CliFlags} flags
 * @returns {Promise<'retry'|'skip'>}
 */
async function promptSupabaseAuthResolution(rl, promptInput, acc, flags) {
  if (flags.dryRun) {
    logInfo('[dry-run] would show Supabase auth resolution menu');
    return 'skip';
  }
  logInfo('');
  logInfo('Supabase CLI needs authentication. Recommended:');
  logInfo('  • Open Terminal.app (outside the IDE) and run: supabase login');
  logInfo('  • Or paste a personal access token from https://supabase.com/dashboard/account/tokens');
  const choice = (
    await rlQuestion(
      rl,
      '(p)aste token for `supabase login --token`, (r)etry after manual login, (s)kip, (q)uit: ',
    )
  )
    .trim()
    .toLowerCase();
  if (choice === 's' || choice === 'skip') {
    return 'skip';
  }
  if (choice === 'p' || choice === 'paste' || choice === 't') {
    const line = await readSecretLineMaskedOrVisible(
      rl,
      promptInput,
      flags,
      'Token (paste, path to bare secret or .env file, or masked type; q=quit setup): ',
    );
    checkSecretInputQuit(line);
    if (!line.trim()) {
      logWarn('No token provided; choose (r)etry or (s)kip.');
      return 'retry';
    }
    const resolved = await resolveSecretInputForSetup(line, 'SUPABASE_ACCESS_TOKEN');
    applySecretResolutionToAcc(acc, resolved, 'SUPABASE_ACCESS_TOKEN');
    const token = (acc.SUPABASE_ACCESS_TOKEN || '').trim();
    if (token && trySupabaseLoginFromEnvToken(token)) {
      logInfo('supabase login --token succeeded.');
      return 'retry';
    }
    logWarn('Token login failed; fix token or use Terminal.app, then choose (r)etry.');
    return 'retry';
  }
  return 'retry';
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 * @param {Record<string, string>} acc
 * @param {CliFlags} flags
 */
async function promptSupabaseAccessTokenForGithub(rl, promptInput, acc, flags) {
  if (flags.dryRun) {
    logInfo('[dry-run] would prompt for SUPABASE_ACCESS_TOKEN (skipped; not reading env or paste).');
    return;
  }
  const env = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (env) {
    acc.SUPABASE_ACCESS_TOKEN = env;
    logInfo('Using SUPABASE_ACCESS_TOKEN from environment (value not printed).');
    return;
  }
  const dash = 'https://supabase.com/dashboard/account/tokens';
  logInfo(`Supabase access token for GitHub migrations: ${dash}`);
  if (process.platform === 'darwin') {
    spawnSync('open', [dash], { stdio: 'ignore' });
  }
  const line = await readSecretLineMaskedOrVisible(
    rl,
    promptInput,
    flags,
    'Paste token, path to file (bare secret or .env), blank to skip, q=quit entire setup: ',
  );
  checkSecretInputQuit(line);
  if (!line.trim()) return;
  const resolved = await resolveSecretInputForSetup(line, 'SUPABASE_ACCESS_TOKEN');
  applySecretResolutionToAcc(acc, resolved, 'SUPABASE_ACCESS_TOKEN');
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 * @param {Record<string, string>} acc
 * @param {CliFlags} flags
 */
async function promptExpoTokenForGithub(rl, promptInput, acc, flags) {
  if (flags.dryRun) {
    logInfo('[dry-run] would prompt for EXPO_TOKEN (skipped; not reading env or paste).');
    return;
  }
  const env = process.env.EXPO_TOKEN?.trim();
  if (env) {
    acc.EXPO_TOKEN = env;
    logInfo('Using EXPO_TOKEN from environment (value not printed).');
    return;
  }
  const dash = 'https://expo.dev/accounts/[account]/settings/access-tokens';
  logInfo(`Expo access token (EXPO_TOKEN) for CI: create at expo.dev → Account → Access tokens`);
  logInfo(`Docs: ${dash}`);
  if (process.platform === 'darwin') {
    spawnSync('open', ['https://expo.dev/settings/access-tokens'], { stdio: 'ignore' });
  }
  const line = await readSecretLineMaskedOrVisible(
    rl,
    promptInput,
    flags,
    'Paste EXPO_TOKEN, path to file (bare secret or .env), blank to skip, q=quit entire setup: ',
  );
  checkSecretInputQuit(line);
  if (!line.trim()) return;
  const resolved = await resolveSecretInputForSetup(line, 'EXPO_TOKEN');
  applySecretResolutionToAcc(acc, resolved, 'EXPO_TOKEN');
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {CliFlags} flags
 * @param {{ label: string; question: string; command: string; args: string[]; cwd?: string }} spec
 */
async function offerInteractiveLogin(rl, flags, spec) {
  if (flags.dryRun) {
    logInfo(`[dry-run] would offer ${spec.label}: ${spec.command} ${spec.args.join(' ')}`);
    return false;
  }
  const a = (await rlQuestion(rl, spec.question)).trim().toLowerCase();
  if (!(a === '' || a === 'y' || a === 'yes')) {
    return false;
  }
  logInfo(`Running ${spec.label}: ${spec.command} ${spec.args.join(' ')}`);
  const code = runInteractiveWithRl(rl, spec.command, spec.args, { cwd: spec.cwd || REPO_ROOT });
  if (code !== 0) {
    logWarn(`${spec.label} exited with code ${code}`);
    return false;
  }
  logInfo(`${spec.label} completed.`);
  return true;
}

/**
 * @param {CliFlags} flags
 */
function awsProfileArgs(flags) {
  return flags.awsProfile ? ['--profile', flags.awsProfile] : [];
}

/** Drop empty AWS profile env vars so AWS CLI does not treat them as profile name `()`. */
function childProcessEnvForSpawn() {
  const env = { ...process.env };
  if (env.AWS_PROFILE === '') {
    delete env.AWS_PROFILE;
  }
  if (env.AWS_DEFAULT_PROFILE === '') {
    delete env.AWS_DEFAULT_PROFILE;
  }
  return env;
}

/**
 * @param {CliFlags} flags
 */
function awsCallerIdentityOk(flags) {
  const r = spawnSync('aws', ['sts', 'get-caller-identity', ...awsProfileArgs(flags)], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    env: childProcessEnvForSpawn(),
  });
  return r.status === 0;
}

/**
 * @param {string} stackName
 * @param {string} region
 * @param {string[]} profileArgs from awsProfileArgs(flags)
 * @returns {Promise<string | null>} StackStatus or null if missing / error
 */
async function describeCloudFormationStackStatus(stackName, region, profileArgs) {
  const res = await runCmd(
    'aws',
    [
      ...profileArgs,
      'cloudformation',
      'describe-stacks',
      '--region',
      region,
      '--stack-name',
      stackName,
      '--query',
      'Stacks[0].StackStatus',
      '--output',
      'text',
    ],
    { cwd: REPO_ROOT },
  );
  if (res.code !== 0) {
    return null;
  }
  const s = res.stdout.trim();
  return s || null;
}

/**
 * @typedef {{
 *   domain: string;
 *   stackName: string;
 *   region: string;
 *   stackStatus: string | null;
 *   orphanBuckets: boolean;
 *   cloudFrontAliasConflicts: { distributionId: string; matchedAliases: string[] }[];
 *   failedChangeSets: { name: string; status: string; statusReason: string }[];
 *   stuckReviewSuggestedFix: boolean;
 *   stackStatusBlocksDeploy?: boolean;
 *   deployLikelyFails: boolean;
 *   deployLikelyFailReasons: string[];
 * }} AwsPreflightJson
 */

/**
 * @param {string[]} bootstrapArgs path to bootstrap-aws-stack.sh then flags (no --print-preflight-json)
 * @returns {AwsPreflightJson | null}
 */
function runBootstrapPreflightJson(bootstrapArgs) {
  const r = spawnSync('bash', [...bootstrapArgs, '--print-preflight-json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: childProcessEnvForSpawn(),
  });
  const errOut = `${r.stderr || ''}${r.stdout || ''}`.trim();
  if (r.status !== 0) {
    logWarn(`AWS preflight (--print-preflight-json) failed (exit ${r.status ?? 1}). ${errOut.slice(0, 500)}`);
    return null;
  }
  const raw = (r.stdout || '').trim();
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const last = lines[lines.length - 1] || raw;
  try {
    return /** @type {AwsPreflightJson} */ (JSON.parse(last));
  } catch {
    logWarn('Could not parse AWS preflight JSON; continuing without conflict menu.');
    return null;
  }
}

/**
 * @param {string[]} bootstrapArgs
 * @returns {boolean}
 */
function runBootstrapDeleteFailedChangeSets(bootstrapArgs) {
  const r = spawnSync('bash', [...bootstrapArgs, '--delete-failed-change-sets'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'inherit', 'inherit'],
    env: childProcessEnvForSpawn(),
  });
  if (r.status !== 0) {
    logWarn(`delete-failed-change-sets exited ${r.status ?? 1}.`);
    return false;
  }
  return true;
}

/**
 * Interactive conflict resolution before bootstrap (TTY only).
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {CliFlags} flags
 * @param {string[]} bootstrapArgs
 * @returns {Promise<{ skipAwsPhase: boolean; allowConflictingBuckets: boolean }>}
 */
async function resolveAwsPreflightConflictsInteractive(rl, flags, bootstrapArgs) {
  if (!input.isTTY) {
    return { skipAwsPhase: false, allowConflictingBuckets: false };
  }

  /** @type {AwsPreflightJson | null} */
  let pf = runBootstrapPreflightJson(bootstrapArgs);

  while (pf && pf.stuckReviewSuggestedFix) {
    logWarn(
      'CloudFormation may be stuck (REVIEW_IN_PROGRESS and/or FAILED change sets). Deleting FAILED change sets is usually safe.',
    );
    const del = (await rlQuestion(rl, 'Delete FAILED change sets for this stack now? (y/N): ')).trim().toLowerCase();
    if (del !== 'y' && del !== 'yes') {
      break;
    }
    if (!runBootstrapDeleteFailedChangeSets(bootstrapArgs)) {
      break;
    }
    pf = runBootstrapPreflightJson(bootstrapArgs);
  }

  if (!pf || !pf.deployLikelyFails) {
    return { skipAwsPhase: false, allowConflictingBuckets: false };
  }

  const reasons = Array.isArray(pf.deployLikelyFailReasons) ? pf.deployLikelyFailReasons.join(', ') : '';
  logWarn(`AWS preflight: deploy will likely fail until this is addressed (${reasons}).`);
  if ((pf.cloudFrontAliasConflicts || []).length > 0) {
    for (const c of pf.cloudFrontAliasConflicts) {
      logWarn(`  CloudFront distribution ${c.distributionId} uses aliases: ${(c.matchedAliases || []).join(', ')}`);
    }
  }
  if (pf.orphanBuckets) {
    logWarn(
      `  Orphan named buckets may block create: ${pf.buckets?.prodName || ''}, ${pf.buckets?.stagingName || ''}, ${pf.buckets?.deployName || ''}`,
    );
  }
  if (pf.stackStatusBlocksDeploy && pf.stackStatus) {
    logWarn(
      `  Stack "${pf.stackName}" is ${pf.stackStatus}: delete this CloudFormation stack before re-using the same stack name (aws cloudformation delete-stack --stack-name "${pf.stackName}"; then wait for delete-complete).`,
    );
  }

  for (;;) {
    const choice = (
      await rlQuestion(
        rl,
        '(S)kip AWS bootstrap  /  (C)ontinue deploy anyway  /  (D)estructive: empty+delete apex prod/staging/deploy buckets [S]: ',
      )
    )
      .trim()
      .toLowerCase();
    if (choice === '' || choice === 's' || choice === 'skip' || choice === 'q' || choice === 'quit') {
      return { skipAwsPhase: true, allowConflictingBuckets: false };
    }
    if (choice === 'c' || choice === 'continue') {
      return { skipAwsPhase: false, allowConflictingBuckets: true };
    }
    if (choice === 'd' || choice === 'destructive') {
      if ((pf.cloudFrontAliasConflicts || []).length > 0) {
        logWarn(
          'WARNING: CloudFront distributions still use this apex on alternate domains. Deleting buckets can break live sites that use those origins.',
        );
        const ack = (
          await rlQuestion(
            rl,
            "Type exactly 'ACKNOWLEDGE CLOUDFRONT RISK' to run bucket teardown anyway (or Enter to cancel): ",
          )
        ).trim();
        if (ack !== 'ACKNOWLEDGE CLOUDFRONT RISK') {
          logWarn('Destructive cleanup cancelled. Choose another option.');
          continue;
        }
      }
      const td = [path.join(REPO_ROOT, 'scripts', 'pr-preview', 'teardown-preview-domain-buckets.sh'), '--domain', pf.domain, '--region', pf.region];
      if (flags.awsProfile) {
        td.push('--aws-profile', flags.awsProfile);
      }
      if ((pf.cloudFrontAliasConflicts || []).length > 0) {
        td.push('--i-acknowledge-cloudfront-may-break');
      }
      logWarn('WARNING: This permanently deletes data in the three named S3 buckets.');
      const phrase = (
        await rlQuestion(
          rl,
          "Type exactly 'PERMANENTLY DELETE BUCKETS' to confirm (or Enter to cancel): ",
        )
      ).trim();
      if (phrase !== 'PERMANENTLY DELETE BUCKETS') {
        logWarn('Destructive cleanup cancelled.');
        continue;
      }
      // Pass confirmation via env so teardown never calls `read` (freezes under IDE readline + TTY).
      const tdEnv = { ...childProcessEnvForSpawn(), BEAKER_DELETE_BUCKETS_CONFIRM: 'PERMANENTLY DELETE BUCKETS' };
      const tdCode =
        spawnSync('bash', td, {
          cwd: REPO_ROOT,
          env: tdEnv,
          stdio: ['ignore', 'inherit', 'inherit'],
          encoding: 'utf8',
        }).status ?? 1;
      if (tdCode !== 0) {
        logWarn('Bucket teardown did not complete successfully; choose another option.');
        continue;
      }
      pf = runBootstrapPreflightJson(bootstrapArgs);
      if (!pf || !pf.deployLikelyFails) {
        logInfo('Preflight: deploy-blocking issues appear cleared; proceeding to bootstrap.');
        return { skipAwsPhase: false, allowConflictingBuckets: false };
      }
      logWarn('Conflicts still reported after teardown; choose Skip, Continue anyway, or retry destructive after fixing CloudFormation/CloudFront in the console.');
      continue;
    }
    logWarn('Unrecognized choice; enter S, C, or D.');
  }
}

/**
 * @param {CliFlags} flags
 */
function ghAuthOk() {
  const r = spawnSync('gh', ['auth', 'status'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return r.status === 0;
}

/**
 * @param {CliFlags} flags
 */
function easWhoamiOk() {
  const r = spawnSync('npx', ['--yes', 'eas-cli', 'whoami'], {
    cwd: MOBILE_DIR,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return r.status === 0;
}

/**
 * Retry `supabase projects list` until success or user declines login.
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {CliFlags} flags
 * @param {Record<string, string>} acc
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 */
async function ensureSupabaseCliAuth(rl, flags, acc, promptInput) {
  const tryList = async () => runCmd('supabase', ['projects', 'list', '-o', 'json'], { cwd: REPO_ROOT });

  let listRes = await tryList();
  if (listRes.code === 0) {
    return listRes;
  }

  const envTok = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!flags.dryRun && envTok && trySupabaseLoginFromEnvToken(envTok)) {
    listRes = await tryList();
    if (listRes.code === 0) {
      return listRes;
    }
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    logWarn('Supabase CLI is not authenticated (or the projects list request failed).');
    logWarn(redactForLog(listRes.stderr || listRes.stdout));
    const res = await promptSupabaseAuthResolution(rl, promptInput, acc, flags);
    if (res === 'skip') {
      return listRes;
    }
    listRes = await tryList();
    if (listRes.code === 0) {
      return listRes;
    }
  }
  return listRes;
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {CliFlags} flags
 */
async function ensureAwsCredentials(rl, flags) {
  if (flags.dryRun) {
    return;
  }
  if (awsCallerIdentityOk(flags)) {
    return;
  }
  logWarn('AWS CLI: `aws sts get-caller-identity` failed (missing or expired credentials).');
  for (let i = 0; i < 8; i += 1) {
    const c = (
      await rlQuestion(
        rl,
        'Fix AWS — (l) aws sso login, (c) aws configure, (r) re-check caller identity, (s)kip, (q)uit: ',
      )
    )
      .trim()
      .toLowerCase();
    if (c === 's' || c === 'skip') {
      return;
    }
    if (c === 'q' || c === 'quit' || c === 'exit' || c === 'x') {
      throw new SetupQuit();
    }
    if (c === 'r' || c === 'retry' || c === '') {
      if (awsCallerIdentityOk(flags)) {
        logInfo('AWS credentials OK.');
        return;
      }
      logWarn('get-caller-identity still failing.');
      continue;
    }
    if (c === 'l' || c === 'sso') {
      const args = ['sso', 'login', ...awsProfileArgs(flags)];
      logInfo(`Running: aws ${args.join(' ')}`);
      if (input.isTTY) {
        logInfo(
          'If this hangs, use Terminal.app and run the same command there (IDE readline + AWS prompts often conflict).',
        );
      }
      pauseRl(rl);
      try {
        runInteractive('aws', args, { cwd: REPO_ROOT, env: childProcessEnvForSpawn() });
      } finally {
        resumeRl(rl);
      }
      continue;
    }
    if (c === 'c' || c === 'configure') {
      logInfo('Running: aws configure');
      if (input.isTTY) {
        logInfo(
          'If prompts freeze here, use Terminal.app: aws configure (IDE readline + AWS configure often conflict).',
        );
      }
      pauseRl(rl);
      try {
        runInteractive('aws', ['configure'], { cwd: REPO_ROOT, env: childProcessEnvForSpawn() });
      } finally {
        resumeRl(rl);
      }
      continue;
    }
    logWarn('Unknown choice; use l, c, r, s, or q.');
  }
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
    logWarn(`gh secret set ${name} failed: ${redactForLog(r.stderr || r.stdout || '')}`);
  }
  return r.status ?? 1;
}

function ghVariableSetSync(repo, name, value, dryRun) {
  if (dryRun) {
    logInfo(`[dry-run] gh variable set ${name} --repo ${repo}`);
    return 0;
  }
  const r = spawnSync('gh', ['variable', 'set', name, '--repo', repo, '--body', value], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (r.status !== 0) {
    logWarn(`gh variable set ${name} failed: ${redactForLog(r.stderr || '')}`);
  }
  return r.status ?? 1;
}

function resolveGhRepo() {
  const r = spawnSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) return '';
  return (r.stdout || '').trim();
}

function which(cmd) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(cmd)) return '';
  const r = spawnSync('sh', ['-c', `command -v "${cmd}" 2>/dev/null`], { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim().split('\n')[0] : '';
}

/**
 * Use controlling TTY when stdin is piped so readline stays open between phases.
 * @returns {{ rl: import('node:readline/promises').ReadLine; promptInput: import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void } }}
 */
function createPromptInterface() {
  let inStream = input;
  if (!input.isTTY) {
    try {
      const fd = openSync('/dev/tty', 'r');
      inStream = new ReadStream(undefined, { fd });
    } catch {
      /* interactive prompts may not work without a TTY */
    }
  }
  return { rl: createInterface({ input: inStream, output }), promptInput: inStream };
}

/**
 * @param {CliFlags} _flags
 * @param {import('node:readline/promises').ReadLine} _rl
 */
async function phasePrereqs(_flags, _rl) {
  const need = ['node', 'npm'];
  const optional = ['supabase', 'aws', 'gh'];
  for (const b of need) {
    if (!which(b)) {
      console.error(`[setup] Missing required tool: ${b}`);
      process.exit(1);
    }
  }
  logInfo('Optional CLIs (install to enable phases):');
  for (const b of optional) {
    logInfo(`  ${b}: ${which(b) ? 'ok' : 'not found'}`);
  }
  if (!which('supabase')) {
    logWarn('Install Supabase CLI: https://supabase.com/docs/guides/cli');
  }
}

/**
 * @param {CliFlags} flags
 * @param {import('node:readline/promises').ReadLine} rl
 */
async function phaseIdentity(flags, rl) {
  if (flags.skipRename) {
    logInfo('Skipping rename (--skip-rename).');
    return;
  }

  const identity = await detectRepoIdentity(REPO_ROOT);
  for (const w of identity.warnings) {
    logWarn(w);
  }
  logInfo(`Detected product display name: "${identity.displayName}"`);
  logInfo(`Detected legal entity (package.json author): "${identity.legalAuthor}"`);

  const fromName = identity.displayName;
  const fromLegal = identity.legalAuthor;

  const toName = (await rlQuestion(rl, 'New display name: ')).trim();
  if (!toName) {
    logWarn('No new name; skipping rename.');
    return;
  }

  const doLegal = await rlQuestion(rl, 'Also replace legal organization string across the repo? (y/N): ');
  let toLegal = '';
  if (/^y(es)?$/i.test(doLegal.trim())) {
    toLegal = (await rlQuestion(rl, 'New legal organization name: ')).trim();
    if (!toLegal) {
      logWarn('Legal rename requested but no new value; run rename without --from-legal/--to-legal.');
    }
  }

  const dry = flags.dryRun ? ['--dry-run'] : [];
  const legalArgs =
    toLegal && fromLegal && fromLegal !== toLegal ? ['--from-legal', fromLegal, '--to-legal', toLegal] : [];
  logInfo(`Running rename: display "${fromName}" -> "${toName}"${legalArgs.length ? ' + legal entity' : ''}`);
  const code = runInteractiveWithRl(
    rl,
    'npm',
    ['run', 'rename', '--', '--from', fromName, '--to', toName, ...legalArgs, ...dry],
    { cwd: REPO_ROOT },
  );
  if (code !== 0) {
    logWarn('rename exited non-zero; fix issues and re-run with --skip-rename or repeat this phase.');
  }
}

/**
 * @param {CliFlags} flags
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {Record<string, string>} acc
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 */
async function phaseSupabase(flags, rl, acc, promptInput) {
  if (!which('supabase')) {
    logWarn('Supabase CLI not installed; skipping supabase phase.');
    return;
  }
  const listRes = await ensureSupabaseCliAuth(rl, flags, acc, promptInput);
  if (listRes.code !== 0) {
    logWarn('Supabase phase skipped: not authenticated (run `supabase login` and try again).');
    return;
  }

  let orgsRes = await runCmd('supabase', ['orgs', 'list', '-o', 'json'], { cwd: REPO_ROOT });
  if (orgsRes.code !== 0) {
    logWarn('Could not list Supabase organizations.');
    logWarn(redactForLog(orgsRes.stderr || orgsRes.stdout));
    for (let oi = 0; oi < 8 && orgsRes.code !== 0; oi += 1) {
      const res = await promptSupabaseAuthResolution(rl, promptInput, acc, flags);
      if (res === 'skip') break;
      orgsRes = await runCmd('supabase', ['orgs', 'list', '-o', 'json'], { cwd: REPO_ROOT });
    }
  }
  if (orgsRes.code !== 0) {
    logWarn('Supabase org list still failing; skipping supabase phase.');
    return;
  }
  let orgs;
  try {
    orgs = parseOrgsListJson(orgsRes.stdout);
  } catch {
    logWarn('Failed to parse orgs JSON');
    return;
  }
  if (orgs.length === 0) {
    logWarn('No Supabase organizations found for this account.');
    return;
  }
  logInfo('Supabase organizations (id / name):');
  orgs.forEach((o, i) => logInfo(`  [${i}] ${o.id}  ${o.name}`));
  const orgIdx = parseInt(
    (await rlQuestion(rl, `Choose org index [0]: `)).trim() || '0',
    10,
  );
  const org = orgs[Number.isFinite(orgIdx) ? orgIdx : 0];
  if (!org) {
    logWarn('Invalid org selection.');
    return;
  }

  let projects;
  try {
    projects = parseProjectsListJson(listRes.stdout);
  } catch {
    logWarn('Failed to parse projects list');
    return;
  }

  const region =
    (await rlQuestion(rl, 'Default region for new projects [us-east-1]: ')).trim() || 'us-east-1';

  const supabaseSlugBase = await readSupabaseProjectSlugBase();
  logInfo(
    `Default new Supabase project slug per tier: ${supabaseSlugBase}-<staging|production|preview> (from apps/mobile/app.config.js; same word rules as rename).`,
  );

  /**
   * @param {'staging'|'production'|'preview'} tier
   */
  async function configureTier(tier) {
    const prefix =
      tier === 'staging' ? 'STAGING' : tier === 'production' ? 'PRODUCTION' : 'PREVIEW';
    const mode = (
      await rlQuestion(rl, `[${tier}] (c)reate new project or (s)elect existing? [s]: `)
    )
      .trim()
      .toLowerCase();
    const create = mode === 'c' || mode === 'create';

    let ref = '';
    let dbPassword = '';

    if (create) {
      const suggestedSlug = `${supabaseSlugBase}-${tier}`;
      const slugAnswer = (await rlQuestion(rl, `[${tier}] project name slug [${suggestedSlug}]: `)).trim();
      const defaultName = slugAnswer || suggestedSlug;
      const genPw = crypto.randomBytes(16).toString('base64url');
      const dbPk = supabaseDbPasswordEnvKey(tier);
      logInfo(
        `[${tier}] Next: database password for the new project (Enter = random). Typed input is masked on a real TTY.`,
      );
      const rawPw = await readSecretLineMaskedOrVisible(
        rl,
        promptInput,
        flags,
        `[${tier}] Database password — blank for random; paste, path, or masked type (q=quit): `,
      );
      checkSecretInputQuit(rawPw);
      if (!rawPw.trim()) {
        dbPassword = genPw;
      } else {
        const resolved = await resolveSecretInputForSetup(rawPw, dbPk);
        applySecretResolutionToAcc(acc, resolved, dbPk);
        dbPassword = (acc[dbPk] && String(acc[dbPk]).trim()) || resolved.primary.trim() || genPw;
      }
      const args = [
        'projects',
        'create',
        defaultName,
        '--org-id',
        org.id,
        '--db-password',
        dbPassword,
        '--region',
        region,
        '-o',
        'json',
        '--yes',
      ];
      if (flags.dryRun) {
        logInfo(`[dry-run] supabase ${args.map((a) => (a === dbPassword ? '[db-password]' : a)).join(' ')}`);
        const dbPlaceholder = 'dry-run-db-password';
        acc[`${prefix}_SUPABASE_URL`] = 'https://dry-run.supabase.co';
        acc[`${prefix}_SUPABASE_ANON_KEY`] = 'dry-run-anon';
        acc[`${prefix}_SUPABASE_PROJECT_REF`] = 'dry-run-ref';
        acc[`${prefix}_SUPABASE_DB_PASSWORD`] = dbPlaceholder;
        if (tier === 'preview') {
          acc.SUPABASE_PREVIEW_PROJECT_REF = 'dry-run-ref';
          acc.SUPABASE_PREVIEW_DB_PASSWORD = dbPlaceholder;
          acc.SUPABASE_PREVIEW_DB_URL = 'postgresql://postgres:[redacted]@db.dry-run-ref.supabase.co:5432/postgres';
          acc.PR_TESTING_SUPABASE_URL = acc.PREVIEW_SUPABASE_URL;
          acc.PR_TESTING_SUPABASE_ANON_KEY = acc.PREVIEW_SUPABASE_ANON_KEY;
          acc.PR_TESTING_SUPABASE_PROJECT_REF = 'dry-run-ref';
          acc.PR_TESTING_SUPABASE_SERVICE_ROLE_KEY = 'dry-run-service';
        }
        logInfo(`[dry-run] skipping api-keys fetch for ${tier}`);
        return;
      } else {
        const cr = await runCmd('supabase', args, { cwd: REPO_ROOT });
        if (cr.code !== 0) {
          logWarn(`Create failed for ${tier}`);
          logWarn(redactForLog(cr.stderr));
          return;
        }
        try {
          ref = parseProjectCreateJson(cr.stdout).id;
        } catch {
          logWarn('Could not parse create output; check Supabase dashboard for project ref.');
          return;
        }
        const refreshed = await runCmd('supabase', ['projects', 'list', '-o', 'json'], { cwd: REPO_ROOT });
        if (refreshed.code === 0) {
          try {
            projects = parseProjectsListJson(refreshed.stdout);
          } catch {
            /* keep previous list */
          }
        }
      }
    } else {
      const filtered = projects.filter((p) => p.organization_id === org.id || !p.organization_id);
      const choices = filtered.length ? filtered : projects;
      const suggestedSlug = `${supabaseSlugBase}-${tier}`;
      const envHint =
        tier === 'preview'
          ? 'PREVIEW_SUPABASE_* and PR_TESTING_SUPABASE_*'
          : `${prefix}_SUPABASE_*`;
      logInfo(`This step configures the ${tier} tier (${envHint}).`);
      logInfo(`Expected create slug for this tier: ${suggestedSlug}.`);
      logInfo('Projects (org-filtered if possible):');
      choices.forEach((p, i) => logInfo(`  ${formatSupabaseProjectChoiceLine(i, p)}`));
      const recommended = pickRecommendedSupabaseProject(choices, tier, supabaseSlugBase);
      const last = choices.length - 1;
      const indexQuestion = recommended
        ? `[${tier}] Project index (0-${last}) recommending "${formatSupabaseProjectChoiceLine(
            recommended.index,
            recommended.project,
          )}" [${recommended.index}]: `
        : `[${tier}] Project index (0-${last}) — enter index (no automatic recommendation): `;
      const indexAnswer = (await rlQuestion(rl, indexQuestion)).trim();
      const pick = parseInt(
        indexAnswer || (recommended ? String(recommended.index) : ''),
        10,
      );
      const proj = choices[Number.isFinite(pick) ? pick : -1];
      if (!proj) {
        logWarn('Invalid project index.');
        return;
      }
      ref = proj.id;
      const dbPk = supabaseDbPasswordEnvKey(tier);
      const rawPw = await readSecretLineMaskedOrVisible(
        rl,
        promptInput,
        flags,
        `[${tier}] Database password — paste, path to file, or masked type (q=quit): `,
      );
      checkSecretInputQuit(rawPw);
      if (!rawPw.trim() && !flags.dryRun) {
        logWarn('DB password required for linking/CI; skipping tier.');
        return;
      }
      if (rawPw.trim()) {
        const resolved = await resolveSecretInputForSetup(rawPw, dbPk);
        applySecretResolutionToAcc(acc, resolved, dbPk);
        dbPassword = (acc[dbPk] && String(acc[dbPk]).trim()) || resolved.primary.trim();
      } else {
        dbPassword = '';
      }
      if (!dbPassword && !flags.dryRun) {
        logWarn('DB password required for linking/CI; skipping tier.');
        return;
      }
    }

    if (flags.dryRun) {
      logInfo(`[dry-run] would run: supabase projects api-keys --project-ref ${ref} (${tier})`);
      const apiUrl = projectApiUrl(ref);
      const anon = 'dry-run-anon';
      const service = 'dry-run-service';
      const dbPw = 'dry-run-db-password';
      if (tier === 'preview') {
        acc.PREVIEW_SUPABASE_URL = apiUrl;
        acc.PREVIEW_SUPABASE_ANON_KEY = anon;
        acc.SUPABASE_PREVIEW_PROJECT_REF = ref;
        acc.SUPABASE_PREVIEW_DB_PASSWORD = dbPw;
        acc.SUPABASE_PREVIEW_DB_URL = `postgresql://postgres:[redacted]@db.${ref}.supabase.co:5432/postgres`;
        acc.PR_TESTING_SUPABASE_URL = apiUrl;
        acc.PR_TESTING_SUPABASE_ANON_KEY = anon;
        acc.PR_TESTING_SUPABASE_PROJECT_REF = ref;
        acc.PR_TESTING_SUPABASE_SERVICE_ROLE_KEY = service;
      } else {
        acc[`${prefix}_SUPABASE_URL`] = apiUrl;
        acc[`${prefix}_SUPABASE_ANON_KEY`] = anon;
        acc[`${prefix}_SUPABASE_PROJECT_REF`] = ref;
        acc[`${prefix}_SUPABASE_DB_PASSWORD`] = dbPw;
        acc[`${prefix}_SUPABASE_SERVICE_ROLE_KEY`] = service;
      }
      logInfo(`[dry-run] ${tier} tier: placeholder keys only (no api-keys CLI call).`);
      return;
    }

    const keysRes = await runCmd('supabase', ['projects', 'api-keys', '--project-ref', ref, '-o', 'json'], {
      cwd: REPO_ROOT,
    });
    if (keysRes.code !== 0) {
      logWarn(`api-keys failed for ${ref}`);
      return;
    }
    let anon = '';
    let service = '';
    try {
      const parsed = parseApiKeysJson(keysRes.stdout);
      anon = parsed.anon;
      service = parsed.service_role;
    } catch (e) {
      logWarn('Failed to parse API keys JSON');
      return;
    }

    const apiUrl = projectApiUrl(ref);
    if (tier === 'preview') {
      acc.PREVIEW_SUPABASE_URL = apiUrl;
      acc.PREVIEW_SUPABASE_ANON_KEY = anon;
      acc.SUPABASE_PREVIEW_PROJECT_REF = ref;
      acc.SUPABASE_PREVIEW_DB_PASSWORD = dbPassword;
      acc.SUPABASE_PREVIEW_DB_URL = postgresConnectionUri(ref, dbPassword);
      acc.PR_TESTING_SUPABASE_URL = apiUrl;
      acc.PR_TESTING_SUPABASE_ANON_KEY = anon;
      acc.PR_TESTING_SUPABASE_PROJECT_REF = ref;
      acc.PR_TESTING_SUPABASE_SERVICE_ROLE_KEY = service;
    } else {
      acc[`${prefix}_SUPABASE_URL`] = apiUrl;
      acc[`${prefix}_SUPABASE_ANON_KEY`] = anon;
      acc[`${prefix}_SUPABASE_PROJECT_REF`] = ref;
      acc[`${prefix}_SUPABASE_DB_PASSWORD`] = dbPassword;
      acc[`${prefix}_SUPABASE_SERVICE_ROLE_KEY`] = service;
    }
    logInfo(`[${tier}] Configured project ref ${ref} (keys stored locally, not printed).`);
  }

  await configureTier('staging');
  await configureTier('production');
  await configureTier('preview');

  await promptSupabaseAccessTokenForGithub(rl, promptInput, acc, flags);
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {{ ok: boolean; error?: string; zones: { id: string; name: string }[] }} zonesRes
 * @returns {Promise<string>}
 */
async function promptHostedZoneAfterDiscovery(rl, zonesRes) {
  if (!zonesRes.ok) {
    logWarn(`Route53 discovery failed: ${zonesRes.error || 'unknown error'}`);
    return (await rlQuestion(rl, 'Route53 hosted zone ID: ')).trim();
  }
  if (zonesRes.zones.length === 0) {
    logWarn('No public Route53 hosted zone for this apex domain in the current AWS account.');
    return (await rlQuestion(rl, 'Route53 hosted zone ID: ')).trim();
  }
  if (zonesRes.zones.length === 1) {
    const only = zonesRes.zones[0];
    logInfo(`Discovered public hosted zone ${only.id} (${only.name}).`);
    const a = (await rlQuestion(rl, 'Use this hosted zone? [Y/e to enter a different ID]: ')).trim().toLowerCase();
    if (a === 'e' || a === 'edit') {
      return (await rlQuestion(rl, 'Route53 hosted zone ID: ')).trim();
    }
    return only.id;
  }
  logInfo('Multiple public hosted zones match this apex:');
  for (let i = 0; i < zonesRes.zones.length; i += 1) {
    const z = zonesRes.zones[i];
    logInfo(`  ${i + 1}. ${z.id}  ${z.name}`);
  }
  for (;;) {
    const raw = (await rlQuestion(rl, 'Choose number (1–n), or 0 to type hosted zone ID manually: ')).trim();
    const n = parseInt(raw, 10);
    if (raw === '0') {
      return (await rlQuestion(rl, 'Route53 hosted zone ID: ')).trim();
    }
    if (!Number.isNaN(n) && n >= 1 && n <= zonesRes.zones.length) {
      return zonesRes.zones[n - 1].id;
    }
    logWarn('Invalid choice; enter a number shown above, or 0 for manual input.');
  }
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {{ ok: boolean; error?: string; matches: { arn: string; domainName: string }[] }} certsRes
 * @returns {Promise<string>}
 */
async function promptAcmCertAfterDiscovery(rl, certsRes) {
  if (!certsRes.ok) {
    logWarn(`ACM discovery failed: ${certsRes.error || 'unknown error'}`);
    return (await rlQuestion(rl, 'ACM certificate ARN (us-east-1, covers apex + wildcard): ')).trim();
  }
  if (certsRes.matches.length === 0) {
    logWarn(
      `No issued ACM certificate in ${ACM_CLOUDFRONT_REGION} covers both the apex and *.apex for this domain.`,
    );
    return (await rlQuestion(rl, 'ACM certificate ARN (us-east-1, covers apex + wildcard): ')).trim();
  }
  if (certsRes.matches.length === 1) {
    const only = certsRes.matches[0];
    logInfo(`Discovered ACM certificate in ${ACM_CLOUDFRONT_REGION} (primary name: ${only.domainName}).`);
    const a = (await rlQuestion(rl, 'Use this certificate? [Y/e to enter a different ARN]: ')).trim().toLowerCase();
    if (a === 'e' || a === 'edit') {
      return (await rlQuestion(rl, 'ACM certificate ARN (us-east-1, covers apex + wildcard): ')).trim();
    }
    return only.arn;
  }
  logInfo(`Multiple matching ACM certificates in ${ACM_CLOUDFRONT_REGION}:`);
  for (let i = 0; i < certsRes.matches.length; i += 1) {
    const c = certsRes.matches[i];
    logInfo(`  ${i + 1}. ${c.domainName}  ${c.arn}`);
  }
  for (;;) {
    const raw = (await rlQuestion(rl, 'Choose number (1–n), or 0 to type certificate ARN manually: ')).trim();
    const n = parseInt(raw, 10);
    if (raw === '0') {
      return (await rlQuestion(rl, 'ACM certificate ARN (us-east-1, covers apex + wildcard): ')).trim();
    }
    if (!Number.isNaN(n) && n >= 1 && n <= certsRes.matches.length) {
      return certsRes.matches[n - 1].arn;
    }
    logWarn('Invalid choice; enter a number shown above, or 0 for manual input.');
  }
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {{ ok: boolean; error?: string; zones: { id: string; name: string }[] }} zonesRes
 * @param {{ ok: boolean; error?: string; matches: { arn: string; domainName: string }[] }} certsRes
 * @returns {Promise<{ zone: string; cert: string }>}
 */
async function resolveAwsHostedZoneAndCertificate(rl, zonesRes, certsRes) {
  const singleZ = zonesRes.ok && zonesRes.zones.length === 1;
  const singleC = certsRes.ok && certsRes.matches.length === 1;
  if (singleZ && singleC) {
    const z = zonesRes.zones[0];
    const c = certsRes.matches[0];
    logInfo(`Discovered hosted zone ${z.id} (${z.name}).`);
    logInfo(`Discovered ACM certificate in ${ACM_CLOUDFRONT_REGION} (primary name: ${c.domainName}).`);
    const a = (await rlQuestion(rl, 'Use these values? [Y/e to enter zone ID and ARN manually]: '))
      .trim()
      .toLowerCase();
    if (a !== 'e' && a !== 'edit') {
      return { zone: z.id, cert: c.arn };
    }
    const zone = (await rlQuestion(rl, 'Route53 hosted zone ID: ')).trim();
    const cert = (await rlQuestion(rl, 'ACM certificate ARN (us-east-1, covers apex + wildcard): ')).trim();
    return { zone, cert };
  }
  const zone = await promptHostedZoneAfterDiscovery(rl, zonesRes);
  const cert = await promptAcmCertAfterDiscovery(rl, certsRes);
  return { zone, cert };
}

/**
 * @param {CliFlags} flags
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {Record<string, string>} acc
 */
async function phaseAws(flags, rl, acc) {
  if (!which('aws')) {
    logWarn('AWS CLI not found; skipping AWS bootstrap.');
    return;
  }
  await ensureAwsCredentials(rl, flags);

  const domain = (await rlQuestion(rl, 'APEX domain (e.g. example.com): ')).trim();
  if (!domain) {
    logWarn('No domain provided; skipping AWS bootstrap (re-run this phase when ready).');
    return;
  }
  logInfo(`Querying AWS for Route53 hosted zone and ACM certificate (${ACM_CLOUDFRONT_REGION})…`);
  const profileArgs = awsProfileArgs(flags);
  const zonesRes = await discoverRoute53PublicZonesForApex(domain, profileArgs);
  const certsRes = await discoverIssuedCertsCoveringApexWildcard(domain, profileArgs);
  const { zone, cert } = await resolveAwsHostedZoneAndCertificate(rl, zonesRes, certsRes);
  if (!zone || !cert) {
    logWarn('Missing hosted zone ID or ACM certificate ARN; skipping AWS bootstrap.');
    return;
  }
  const slugBase = await readSupabaseProjectSlugBase();
  const defaultCfStack = `${slugBase}-pr-preview`;
  const stack =
    (await rlQuestion(rl, `CloudFormation stack name [${defaultCfStack}]: `)).trim() || defaultCfStack;
  const region =
    (await rlQuestion(rl, 'AWS region [us-east-1]: ')).trim() || 'us-east-1';
  const prefix = (await rlQuestion(rl, 'Preview URL prefix [pr-]: ')).trim() || 'pr-';

  acc.PR_PREVIEW_DOMAIN = domain;
  acc.PR_PREVIEW_HOSTED_ZONE_ID = zone;
  acc.PR_PREVIEW_CERTIFICATE_ARN = cert;
  acc.PR_PREVIEW_STACK_NAME = stack;
  acc.PR_PREVIEW_PREFIX = prefix;
  acc.PR_PREVIEW_AWS_REGION = region;

  const args = [
    path.join(REPO_ROOT, 'scripts', 'pr-preview', 'bootstrap-aws-stack.sh'),
    '--domain',
    domain,
    '--hosted-zone-id',
    zone,
    '--certificate-arn',
    cert,
    '--stack-name',
    stack,
    '--region',
    region,
    '--preview-prefix',
    prefix,
    '--env-file',
    AWS_ENV_PATH,
  ];
  if (flags.awsProfile) {
    args.push('--aws-profile', flags.awsProfile);
  }
  if (flags.dryRun) {
    logInfo(
      `[dry-run] would run bootstrap-aws-stack.sh (domain=${domain}, hostedZone=${zone}, stack=${stack}, certificateArn=(set)); no script execution or .env.aws.generated.local read.`,
    );
    return;
  }

  const conflictOutcome = await resolveAwsPreflightConflictsInteractive(rl, flags, args);
  if (conflictOutcome.skipAwsPhase) {
    logWarn('Skipping AWS bootstrap by your choice; re-run with --from=aws when ready.');
    return;
  }
  if (conflictOutcome.allowConflictingBuckets) {
    args.push('--allow-conflicting-named-buckets');
  }

  if (input.isTTY) {
    const cfStatus = await describeCloudFormationStackStatus(stack, region, profileArgs);
    if (cfStatus === 'CREATE_COMPLETE' || cfStatus === 'UPDATE_COMPLETE') {
      logInfo(`CloudFormation stack "${stack}" is already ${cfStatus}.`);
      const mode = (
        await rlQuestion(
          rl,
          '(D)eploy / update stack  or  (R)efresh outputs only (skip CloudFormation) [D]: ',
        )
      )
        .trim()
        .toLowerCase();
      if (mode === 'r' || mode === 'refresh' || mode === 'refresh-outputs') {
        args.push('--if-stack-exists', 'refresh-outputs');
      }
    }
  }

  logInfo('Running bootstrap-aws-stack.sh (outputs go to .env.aws.generated.local)');
  const code = runInteractive('bash', args, { cwd: REPO_ROOT, env: childProcessEnvForSpawn() });
  if (code !== 0) {
    logWarn(
      'AWS bootstrap failed. Common causes: retained S3 buckets for this apex (see preflight), duplicate CloudFront aliases, IAM permissions, or ACM in us-east-1. Scroll up for [DIAG] lines from bootstrap-aws-stack.sh.',
    );
    logWarn('Fix the issue, then re-run with: node scripts/setup-full.mjs --from=aws');
    return;
  }
  const awsFile = await readEnvFileIfExists(AWS_ENV_PATH);
  for (const [bootstrapKey, envKey] of Object.entries(AWS_BOOTSTRAP_TO_ENV)) {
    if (awsFile[bootstrapKey]) acc[envKey] = awsFile[bootstrapKey];
  }
}

/**
 * @param {CliFlags} flags
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {Record<string, string>} acc
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 */
async function phaseExpo(flags, rl, acc, promptInput) {
  logInfo(
    'If `eas login` misbehaves in this terminal, use Terminal.app — Expo often expects a real TTY (this script uses /dev/tty when available).',
  );

  if (!flags.dryRun && !easWhoamiOk()) {
    logWarn('EAS CLI: `eas whoami` failed (not logged in or invalid EXPO_TOKEN).');
    await offerInteractiveLogin(rl, flags, {
      label: 'Expo / EAS login',
      question: 'Run `npx eas-cli login` in apps/mobile now? (Y/n/q quit): ',
      command: 'npx',
      args: ['--yes', 'eas-cli', 'login'],
      cwd: MOBILE_DIR,
    });
    if (!easWhoamiOk()) {
      logWarn('EAS still not authenticated; set EXPO_TOKEN or complete login, then re-run --from=expo.');
    }
  }

  const runEasOnTty = (/** @type {string[]} */ args) => runInteractiveWithRl(rl, 'npx', args, { cwd: MOBILE_DIR });
  const runEasCapture = (/** @type {string[]} */ args) => {
    const r = spawnSync('npx', args, {
      cwd: MOBILE_DIR,
      encoding: 'utf8',
      // Do not leave stdin as an open pipe — eas init --non-interactive can hang or skip writing files.
      stdio: ['ignore', 'pipe', 'pipe'],
      env: childProcessEnvForSpawn(),
    });
    return { status: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
  };

  const outcome = await ensureNonTemplateEasProject({
    acc,
    repoRoot: REPO_ROOT,
    dryRun: flags.dryRun,
    mobileDir: MOBILE_DIR,
    logInfo,
    logWarn,
    question: (q) => rlQuestion(rl, q),
    runEasOnTty,
    runEasCapture,
  });

  if (outcome === 'skip') {
    clearExpoKeysFromAcc(acc);
    return;
  }

  await promptExpoTokenForGithub(rl, promptInput, acc, flags);
}

/**
 * @param {CliFlags} flags
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {Record<string, string>} acc
 */
async function phaseGoogle(flags, rl, acc) {
  const p = await rlQuestion(rl, 'Path to google-services.json for CI (optional, Enter to skip): ');
  const fp = p.trim();
  if (!fp) return;
  if (flags.dryRun) {
    logInfo(`[dry-run] would import GOOGLE_SERVICES_* from ${fp} (skipped; no file read).`);
    return;
  }
  try {
    const abs = path.isAbsolute(fp) ? fp : path.join(REPO_ROOT, fp);
    const vars = await envVarsFromGoogleServicesJson(abs);
    Object.assign(acc, vars);
    logInfo(`Imported ${Object.keys(vars).length} GOOGLE_SERVICES_* keys from file (values not printed).`);
  } catch (e) {
    logWarn(`Could not parse google-services.json: ${(e && e.message) || e}`);
  }
}

/**
 * @param {Record<string, string>} acc
 * @param {CliFlags} flags
 */
async function phaseWrite(acc, flags) {
  if (flags.dryRun) {
    const n = Object.keys(acc).length;
    logInfo(
      `[dry-run] would merge ${n} accumulated keys into .env.cloud.generated.local and .env.local (no file writes).`,
    );
    logInfo('[dry-run] would write .setup-state.json (no file write).');
    return;
  }
  const existing = await readEnvFileIfExists(CLOUD_ENV_PATH);
  const merged = mergeRecords(existing, acc);
  await fs.writeFile(CLOUD_ENV_PATH, stringifyDotEnv(merged), 'utf8');
  logInfo(`Wrote ${Object.keys(merged).length} entries to .env.cloud.generated.local (contents not shown).`);

  const local = await readEnvFileIfExists(LOCAL_ENV_PATH);
  const mergedLocal = mergeRecords(local, acc);
  await fs.writeFile(LOCAL_ENV_PATH, stringifyDotEnv(mergedLocal), 'utf8');
  logInfo(`Merged cloud keys into .env.local (${Object.keys(mergedLocal).length} total keys).`);

  await fs.writeFile(
    STATE_PATH,
    JSON.stringify(
      {
        lastRun: new Date().toISOString(),
        phases: PHASE_ORDER,
        mobileEnabled: acc.MOBILE_ENABLED !== 'false',
        note: 'No secrets stored in this file.',
      },
      null,
      2,
    ),
    'utf8',
  );
}

/**
 * Prompt for missing GitHub Actions env keys, merge into acc, then caller may persist via phaseWrite.
 * @param {CliFlags} flags
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 * @param {Record<string, string>} acc
 * @returns {Promise<'none' | 'declined' | 'completed'>}
 */
async function collectMissingGithubCiEnvIntoAcc(flags, rl, promptInput, acc) {
  if (flags.dryRun) {
    const n = listMissingRequiredGithubForCi(acc).length;
    if (n) {
      logInfo(
        `[dry-run] ${n} required CI env value(s) missing; would offer masked prompts and re-write .env*.local before gh sync.`,
      );
    }
    return 'none';
  }

  let details = listMissingRequiredGithubCiDetails(acc);
  if (!details.length) return 'none';

  if (!input.isTTY) {
    logWarn(
      `${details.length} required GitHub CI value(s) missing locally; skipping prompts (stdin not a TTY). Add keys to .env.local / .env.cloud.generated.local or run this phase in a full terminal.`,
    );
    return 'none';
  }

  const head = (
    await rlQuestion(
      rl,
      `${details.length} value(s) required for GitHub Actions are missing from merged .env files. Enter them now (masked when sensitive)? (Y)es / (N)o [Y]: `,
    )
  )
    .trim()
    .toLowerCase();
  if (head === 'n' || head === 'no' || head === 'skip') {
    logInfo('Skipping interactive CI env collection.');
    return 'declined';
  }

  const pathLine = (await rlQuestion(rl, 'Path to .env-style file with any of these keys (Enter to skip): ')).trim();
  if (pathLine) {
    checkSecretInputQuit(pathLine);
    const primary = details[0].primaryEnvKey;
    const resolved = await resolveSecretInputForSetup(pathLine, primary);
    applySecretResolutionToAcc(acc, resolved, primary);
  }

  details = listMissingRequiredGithubCiDetails(acc);
  for (const d of details) {
    if (resolveValueForGithub(acc, d.def)) continue;

    const hint = d.envKeys.length > 1 ? ` (aliases: ${d.envKeys.join(', ')})` : '';
    const label = `${d.primaryEnvKey} → GitHub ${d.kind} ${d.name}${hint}`;

    let raw;
    if (d.kind === 'secret') {
      raw = await readSecretLineMaskedOrVisible(rl, promptInput, flags, `${label} (Enter to skip): `);
    } else {
      raw = (await rlQuestion(rl, `${label} (Enter to skip): `)).trim();
    }
    checkSecretInputQuit(raw);
    if (!raw) continue;
    const resolved = await resolveSecretInputForSetup(raw, d.primaryEnvKey);
    applySecretResolutionToAcc(acc, resolved, d.primaryEnvKey);
  }

  return 'completed';
}

/**
 * @param {CliFlags} flags
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 * @param {Record<string, string>} acc
 */
async function phaseGithub(flags, rl, acc, promptInput) {
  if (flags.skipGithub) {
    logInfo('Skipping GitHub sync (--skip-github).');
    return;
  }
  if (!which('gh')) {
    logWarn('GitHub CLI not found; install gh and auth: gh auth login');
    return;
  }
  if (!flags.dryRun && !ghAuthOk()) {
    logWarn('GitHub CLI: `gh auth status` failed (not logged in).');
    await offerInteractiveLogin(rl, flags, {
      label: 'GitHub login',
      question: 'Run `gh auth login` now? (Y/n/q quit): ',
      command: 'gh',
      args: ['auth', 'login'],
    });
    if (!ghAuthOk()) {
      logWarn('Still not authenticated to GitHub; secret sync will likely fail.');
    }
  }

  const repo = resolveGhRepo();
  if (!repo) {
    logWarn('Could not resolve repo (gh repo view).');
    return;
  }
  logInfo(`Using repository: ${repo}`);

  const localEnv = await readEnvFileIfExists(LOCAL_ENV_PATH);
  const cloudEnv = await readEnvFileIfExists(CLOUD_ENV_PATH);
  const awsEnv = await readEnvFileIfExists(AWS_ENV_PATH);
  const mergedForGithub = mergeGithubSyncEnv(acc, localEnv, cloudEnv, awsEnv);
  Object.assign(acc, mergedForGithub);
  logInfo('Merged .env.local, .env.cloud.generated.local, and .env.aws.generated.local for GitHub sync (wizard values override file values; contents not printed).');
  logInfo(
    `Env file key counts (names/values not listed): .env.local=${Object.keys(localEnv).length}, .env.cloud.generated.local=${Object.keys(cloudEnv).length}, .env.aws.generated.local=${Object.keys(awsEnv).length}`,
  );

  const collectOutcome = await collectMissingGithubCiEnvIntoAcc(flags, rl, promptInput, acc);
  if (collectOutcome === 'completed' && !flags.dryRun) {
    await phaseWrite(acc, flags);
    const localAfter = await readEnvFileIfExists(LOCAL_ENV_PATH);
    const cloudAfter = await readEnvFileIfExists(CLOUD_ENV_PATH);
    const awsAfter = await readEnvFileIfExists(AWS_ENV_PATH);
    Object.assign(acc, mergeGithubSyncEnv(acc, localAfter, cloudAfter, awsAfter));
    logInfo('Re-loaded env files after saving values for GitHub sync.');
  }

  const secrets = collectGithubSecretPayload(acc);
  const variables = collectGithubVariablePayload(acc);
  logMissingRequiredGithubForCi(acc);

  let ok = 0;
  let fail = 0;
  for (const [name, value] of Object.entries(secrets)) {
    if (!value) continue;
    const c = ghSecretSetSync(repo, name, value, flags.dryRun);
    if (c === 0) {
      ok += 1;
      logInfo(flags.dryRun ? `[dry-run] would set GitHub secret: ${name}` : `GitHub secret set: ${name}`);
    } else fail += 1;
  }
  for (const [name, value] of Object.entries(variables)) {
    if (!value) continue;
    const c = ghVariableSetSync(repo, name, value, flags.dryRun);
    if (c === 0) {
      ok += 1;
      logInfo(flags.dryRun ? `[dry-run] would set GitHub variable: ${name}` : `GitHub variable set: ${name}`);
    } else fail += 1;
  }
  logInfo(`GitHub sync finished: ${ok} ok, ${fail} failed (missing permissions skips).`);
}

async function main() {
  const flags = parseArgv(process.argv.slice(2));
  const { rl, promptInput } = createPromptInterface();

  /** @type {Record<string, string>} */
  let acc = {};

  const startIdx = PHASE_ORDER.indexOf(flags.fromPhase);

  const logCtx = { logInfo, logWarn, repoRoot: REPO_ROOT };
  printIntroBanner(logCtx, { resumeFrom: startIdx > 0 ? flags.fromPhase : undefined });

  if (startIdx === 0 && !flags.dryRun) {
    await rl.question(
      '\nPress Enter after you have reviewed the checklist above (see QUICKSTART.md if needed)…\n',
    );
  }

  if (startIdx > 0) {
    if (flags.dryRun) {
      logInfo(
        `[dry-run] would load merged keys from .env.local / .env.cloud.generated.local / .env.aws.generated.local (--from=${flags.fromPhase}); skipped (no disk read).`,
      );
    } else {
      logInfo(`Loading existing env files (--from=${flags.fromPhase})`);
      acc = mergeRecords(acc, await readEnvFileIfExists(LOCAL_ENV_PATH));
      acc = mergeRecords(acc, await readEnvFileIfExists(CLOUD_ENV_PATH));
      acc = mergeRecords(acc, await readEnvFileIfExists(AWS_ENV_PATH));
    }
  }

  if (!flags.mobileEnabled) {
    acc.MOBILE_ENABLED = 'false';
    logInfo('Mobile disabled (--skip-mobile) — skipping Expo, EAS, and Google Services setup.');
  } else if (startIdx <= PHASE_ORDER.indexOf('expo')) {
    if (!flags.dryRun) {
      const mobileAns = (await rlQuestion(rl, 'Enable mobile (Expo / EAS) builds? [Y/n]: ')).trim().toLowerCase();
      if (mobileAns === 'n' || mobileAns === 'no') {
        flags.mobileEnabled = false;
        logInfo('Mobile disabled — skipping Expo, EAS, and Google Services setup.');
      }
    } else {
      logInfo('[dry-run] would prompt for mobile setup choice (defaulting to enabled).');
    }
    acc.MOBILE_ENABLED = flags.mobileEnabled ? 'true' : 'false';
  } else {
    if (!acc.MOBILE_ENABLED) acc.MOBILE_ENABLED = 'true';
  }

  try {
    for (let i = startIdx; i < PHASE_ORDER.length; i += 1) {
      const phase = PHASE_ORDER[i];
      logInfo(`--- Phase: ${phase} ---`);
      printPhaseIntro(logCtx, phase);

      if (phase === 'prereqs') {
        await phasePrereqs(flags, rl);
        continue;
      }
      if (phase === 'write') {
        await phaseWrite(acc, flags);
        continue;
      }
      if (phase === 'identity' && flags.skipRename) {
        logInfo('Skipping identity/rename (--skip-rename).');
        continue;
      }
      if (phase === 'github' && flags.skipGithub) {
        logInfo('Skipping GitHub sync (--skip-github).');
        continue;
      }
      if ((phase === 'expo' || phase === 'google') && acc.MOBILE_ENABLED === 'false') {
        logInfo(`Skipping ${phase} phase (mobile disabled).`);
        if (phase === 'expo') clearExpoKeysFromAcc(acc);
        continue;
      }

      const phaseAction = await confirmRunPhase(rl, phase);
      if (phaseAction === 'skip') {
        printManualInstructions(logCtx, phase);
        if (phase === 'expo') {
          clearExpoKeysFromAcc(acc);
        }
        continue;
      }

      switch (phase) {
        case 'identity':
          await phaseIdentity(flags, rl);
          break;
        case 'supabase':
          await phaseSupabase(flags, rl, acc, promptInput);
          break;
        case 'aws':
          await phaseAws(flags, rl, acc);
          break;
        case 'expo':
          await phaseExpo(flags, rl, acc, promptInput);
          break;
        case 'google':
          await phaseGoogle(flags, rl, acc);
          break;
        case 'github':
          await phaseGithub(flags, rl, acc, promptInput);
          break;
        default:
          break;
      }
    }
    if (flags.dryRun) {
      logInfo('[dry-run] finished: no env/state files written; no real API keys or tokens merged by this script.');
    } else {
      logInfo('Done. Verify with: gh secret list && gh variable list');
    }
  } catch (e) {
    if (isSetupQuit(e)) {
      logInfo('Setup exited. Goodbye.');
      return;
    }
    throw e;
  } finally {
    rl.close();
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error('[setup] Fatal:', redactForLog(String(err && err.stack ? err.stack : err)));
    process.exit(1);
  });
}

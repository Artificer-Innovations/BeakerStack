#!/usr/bin/env node
/**
 * Configure GitHub Actions variables (and optionally ORG_PROJECT_GITHUB_TOKEN) for
 * .github/workflows/project-label-bridge.yml via gh.
 *
 * Secret entry reuses the same helpers as setup-full: masked typing on a TTY (unless
 * --plain-secret-prompts), or paste / path to a bare secret file (see setup-secret-input).
 *
 * See: docs/project-label-bridge.md
 */

import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { promises as fs, openSync, ReadStream } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import url from 'node:url';

import { readMaskedLineIfTty, resolveSecretInputLine } from '../lib/setup-secret-input.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PAT_PRIMARY_KEY = 'ORG_PROJECT_GITHUB_TOKEN';
const PAT_ALLOW_KEYS = new Set([PAT_PRIMARY_KEY]);

function printHelp() {
  console.log(`Usage: node scripts/github/setup-project-label-bridge.mjs [options]

Configure Actions variables for the optional project-label-bridge workflow (gh CLI).

Options:
  --repo OWNER/NAME        Target repository (default: gh repo view)
  --number N               GITHUB_PROJECT_NUMBER (required). Env: GITHUB_PROJECT_NUMBER.
  --org LOGIN              GITHUB_PROJECT_ORG (optional). Env: GITHUB_PROJECT_ORG.
  --skip-secret            Do not set ORG_PROJECT_GITHUB_TOKEN (no prompt, no stdin read)
  --token-stdin            Read entire classic PAT from process stdin (use with piped input only)
  --token-file PATH        Read PAT from file
  --plain-secret-prompts   Echo typed secrets (default: mask on a real TTY; same as setup-full)
  --dry-run                Print gh commands without running
  -h, --help               Show this help

If no token option is given and ORG_PROJECT_GITHUB_TOKEN is not in the environment, you are
prompted once (masked typing / paste / file path) — same behavior as npm run setup:full secret prompts.

Examples:
  npm run setup:project-label-bridge -- --number 5 --org Artificer-Innovations
  printf '%s' "$ORG_PROJECT_GITHUB_TOKEN" | npm run setup:project-label-bridge -- --number 5 --token-stdin
`);
}

/**
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
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {string} prompt
 */
async function rlQuestion(rl, prompt) {
  try {
    return await rl.question(prompt);
  } catch (e) {
    if (typeof e === 'object' && e !== null && /** @type {{ name?: string }} */ (e).name === 'AbortError') {
      return '';
    }
    throw e;
  }
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} promptInput
 * @param {{ plainSecretPrompts: boolean }} flags
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
 * @param {string} line
 * @returns {Promise<{ pat: string; ignoredKeys: string[] }>}
 */
async function resolvePatLine(line) {
  const resolved = await resolveSecretInputLine({
    line,
    primaryKey: PAT_PRIMARY_KEY,
    allowKeys: PAT_ALLOW_KEYS,
    homedir,
    repoRoot: REPO_ROOT,
    readFileUtf8: (p) => fs.readFile(p, 'utf8'),
  });
  const pat = resolved.primary || resolved.merged[PAT_PRIMARY_KEY] || '';
  return { pat, ignoredKeys: resolved.ignoredKeys };
}

function parseArgv(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  /** @type {{ repo: string; number: string; org: string; dryRun: boolean; plainSecretPrompts: boolean; skipSecret: boolean; tokenStdin: boolean; tokenFile: string }} */
  const o = {
    repo: '',
    number: process.env.GITHUB_PROJECT_NUMBER || '',
    org: process.env.GITHUB_PROJECT_ORG || '',
    dryRun: false,
    plainSecretPrompts: false,
    skipSecret: false,
    tokenStdin: false,
    tokenFile: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--plain-secret-prompts') o.plainSecretPrompts = true;
    else if (a === '--skip-secret') o.skipSecret = true;
    else if (a === '--token-stdin') o.tokenStdin = true;
    else if (a === '--repo') o.repo = argv[++i] || '';
    else if (a === '--number') o.number = argv[++i] || '';
    else if (a === '--org') o.org = argv[++i] || '';
    else if (a === '--token-file') o.tokenFile = argv[++i] || '';
    else {
      console.error(`Unknown option: ${a}`);
      printHelp();
      process.exit(1);
    }
  }
  return o;
}

/**
 * @param {string[]} args
 * @param {{ input?: string | Buffer; dryRun?: boolean }} [opts]
 */
function runGh(args, opts = {}) {
  if (opts.dryRun) {
    console.log(`[dry-run] gh ${args.map((x) => JSON.stringify(x)).join(' ')}`);
    return { status: 0, stdout: '', stderr: '' };
  }
  /** @type {import('node:child_process').StdioOptions} */
  const stdio = opts.input !== undefined ? ['pipe', 'inherit', 'inherit'] : ['inherit', 'inherit', 'inherit'];
  return spawnSync('gh', args, {
    encoding: 'utf8',
    stdio,
    input: opts.input,
  });
}

function ghRepoDefault() {
  const r = runGh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { dryRun: false });
  if (r.status !== 0) {
    console.error('Could not run gh repo view. Install gh, auth with gh auth login, or pass --repo OWNER/NAME.');
    process.exit(1);
  }
  return (r.stdout || '').trim();
}

/**
 * @param {string} token
 * @param {string} repo
 * @param {boolean} dryRun
 */
function ghSecretSetPat(token, repo, dryRun) {
  const r = runGh(['secret', 'set', PAT_PRIMARY_KEY, '--repo', repo], {
    dryRun,
    input: `${token.replace(/\r?\n/g, '').trim()}\n`,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

async function readStdinUtf8() {
  const chunks = [];
  for await (const chunk of input) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8').trim();
}

async function main() {
  const opts = parseArgv(process.argv.slice(2));

  if (!opts.number) {
    console.error('GITHUB_PROJECT_NUMBER is required. Pass --number N or set env GITHUB_PROJECT_NUMBER.');
    printHelp();
    process.exit(1);
  }

  const repo = opts.repo || ghRepoDefault();
  if (!repo) {
    console.error('Empty repository name.');
    process.exit(1);
  }

  let pat = '';
  if (opts.skipSecret) {
    console.log('Skipping ORG_PROJECT_GITHUB_TOKEN (--skip-secret).');
  } else if (opts.tokenStdin) {
    pat = await readStdinUtf8();
    if (!pat) {
      console.error('No data read from stdin (--token-stdin).');
      process.exit(1);
    }
  } else if (opts.tokenFile) {
    try {
      pat = (await fs.readFile(opts.tokenFile, 'utf8')).trim();
    } catch (e) {
      console.error(`Failed to read --token-file: ${e}`);
      process.exit(1);
    }
    if (!pat) {
      console.error('Token file is empty.');
      process.exit(1);
    }
  } else if (process.env.ORG_PROJECT_GITHUB_TOKEN) {
    pat = process.env.ORG_PROJECT_GITHUB_TOKEN.trim();
    console.log('Using ORG_PROJECT_GITHUB_TOKEN from environment.');
  } else if (opts.dryRun) {
    console.log('[dry-run] Would prompt for ORG_PROJECT_GITHUB_TOKEN (interactive / paste / path).');
  } else {
    const { rl, promptInput } = createPromptInterface();
    try {
      const line = await readSecretLineMaskedOrVisible(
        rl,
        promptInput,
        opts,
        `${PAT_PRIMARY_KEY} — paste, path to file, or masked type (blank=skip): `,
      );
      const { pat: resolvedPat, ignoredKeys } = await resolvePatLine(line);
      if (ignoredKeys.length) {
        const uniq = [...new Set(ignoredKeys)].sort();
        console.log(`[project-label-bridge] Secret input ignored unknown keys: ${uniq.join(', ')}`);
      }
      pat = resolvedPat;
    } finally {
      rl.close();
    }
    if (!pat) {
      console.log('Skipping ORG_PROJECT_GITHUB_TOKEN (blank input).');
    }
  }

  const dry = opts.dryRun;

  let r = runGh(['variable', 'set', 'GITHUB_PROJECT_NUMBER', '--repo', repo, '--body', opts.number], { dryRun: dry });
  if (r.status !== 0) process.exit(r.status || 1);

  if (opts.org) {
    r = runGh(['variable', 'set', 'GITHUB_PROJECT_ORG', '--repo', repo, '--body', opts.org], { dryRun: dry });
    if (r.status !== 0) process.exit(r.status || 1);
  } else {
    console.log(
      'Skipping GITHUB_PROJECT_ORG (optional). Workflow default org applies unless you set the variable in the UI.',
    );
  }

  if (pat) {
    ghSecretSetPat(pat, repo, dry);
  }

  console.log(`Done. Target repo: ${repo}`);
  if (!dry) {
    const lr = runGh(['variable', 'list', '--repo', repo], { dryRun: false });
    if (lr.status === 0 && lr.stdout) {
      const lines = lr.stdout.split('\n').filter((line) => /GITHUB_PROJECT_(NUMBER|ORG)/.test(line));
      if (lines.length) console.log(lines.join('\n'));
    }
  } else {
    console.log('  (dry-run — nothing was written)');
  }
  console.log('See docs/project-label-bridge.md for PAT scopes and label conventions.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Resolve and confirm the GitHub repository targeted by setup-full's github phase.
 */

import { spawnSync } from 'node:child_process';

/** Public template repo — adopters should sync secrets to their fork, not here. */
export const BEAKERSTACK_TEMPLATE_GITHUB_REPO =
  'Artificer-Innovations/BeakerStack';

/**
 * @param {string} url
 * @returns {string} owner/repo or ''
 */
export function parseGithubOwnerRepoFromRemoteUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const ssh = /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i.exec(raw);
  if (ssh) return ssh[1];
  try {
    const u = new URL(raw);
    if (!/github\.com$/i.test(u.hostname)) return '';
    const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) return '';
    const owner = parts[0];
    let name = parts[1];
    if (name.endsWith('.git')) name = name.slice(0, -4);
    if (!owner || !name) return '';
    return `${owner}/${name}`;
  } catch {
    return '';
  }
}

/**
 * @param {string} repoRoot
 * @returns {string}
 */
export function getGitOriginRemoteUrl(repoRoot) {
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (r.status !== 0) return '';
  return (r.stdout || '').trim();
}

/**
 * @param {string} repoRoot
 * @param {string} [override] owner/name
 * @returns {{ repo: string; isFork: boolean; parentRepo: string; url: string; originRepo: string; originUrl: string }}
 */
export function resolveGhRepoContext(repoRoot, override = '') {
  const originUrl = getGitOriginRemoteUrl(repoRoot);
  const originRepo = parseGithubOwnerRepoFromRemoteUrl(originUrl);
  const forced = String(override || '').trim();
  if (forced) {
    return {
      repo: forced,
      isFork: false,
      parentRepo: '',
      url: `https://github.com/${forced}`,
      originRepo,
      originUrl,
    };
  }
  const r = spawnSync(
    'gh',
    [
      'repo',
      'view',
      '--json',
      'nameWithOwner,isFork,parent,url',
      '-q',
      '{repo: .nameWithOwner, fork: .isFork, parent: (.parent.nameWithOwner // ""), url: .url}',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );
  if (r.status !== 0) {
    return {
      repo: originRepo,
      isFork: false,
      parentRepo: '',
      url: originRepo ? `https://github.com/${originRepo}` : '',
      originRepo,
      originUrl,
    };
  }
  try {
    const data = JSON.parse((r.stdout || '').trim() || '{}');
    return {
      repo: String(data.repo || originRepo || '').trim(),
      isFork: Boolean(data.fork),
      parentRepo: String(data.parent || '').trim(),
      url: String(data.url || '').trim(),
      originRepo,
      originUrl,
    };
  } catch {
    return {
      repo: originRepo,
      isFork: false,
      parentRepo: '',
      url: originRepo ? `https://github.com/${originRepo}` : '',
      originRepo,
      originUrl,
    };
  }
}

/**
 * @param {string} repo
 */
export function isBeakerstackTemplateRepo(repo) {
  return (
    String(repo || '')
      .trim()
      .toLowerCase() === BEAKERSTACK_TEMPLATE_GITHUB_REPO.toLowerCase()
  );
}

/**
 * @param {{ logInfo: (s: string) => void; logWarn: (s: string) => void }} ctx
 * @param {ReturnType<typeof resolveGhRepoContext>} ghCtx
 * @param {{ secretCount: number; variableCount: number }} counts
 */
export function logGithubSyncTargetSummary(ctx, ghCtx, counts) {
  const { logInfo, logWarn } = ctx;
  const { repo, isFork, parentRepo, originRepo, originUrl } = ghCtx;
  logInfo('');
  logInfo('── GitHub sync target ──');
  logInfo(`  Repository: ${repo || '(unknown)'}`);
  if (originUrl) logInfo(`  git remote origin: ${originUrl}`);
  if (originRepo && originRepo !== repo) {
    logWarn(
      `  origin parses as ${originRepo} but gh repo view resolved ${repo}.`
    );
  }
  if (isFork && parentRepo) {
    logInfo(`  Fork parent (secrets are NOT written here): ${parentRepo}`);
  }
  logInfo(
    `  Will run: gh secret set <name> --repo ${repo} and gh variable set (values not printed).`
  );
  logInfo(
    `  Payload: ${counts.secretCount} secret(s), ${counts.variableCount} variable(s).`
  );
  logInfo('');
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {{ logInfo: (s: string) => void; logWarn: (s: string) => void }} ctx
 * @param {ReturnType<typeof resolveGhRepoContext>} ghCtx
 * @param {{ dryRun: boolean; interactive: boolean }} opts
 * @returns {Promise<boolean>}
 */
export async function confirmGithubRepoSyncTarget(rl, ctx, ghCtx, opts) {
  const { logInfo, logWarn } = ctx;
  const { repo, isFork, parentRepo } = ghCtx;
  if (!repo) {
    logWarn('No GitHub repository resolved; skipping secret sync.');
    return false;
  }

  if (!opts.interactive) {
    logWarn(
      'Non-interactive terminal: skipping GitHub secret sync (cannot confirm target repo). Use a TTY, or set secrets manually on your fork.'
    );
    return false;
  }

  if (isBeakerstackTemplateRepo(repo)) {
    logWarn('');
    logWarn(
      '⚠  You are about to write CI secrets to the public BeakerStack template repository.'
    );
    logWarn(
      '   Adopters should use their own fork: fork on GitHub, clone YOUR repo, then run setup.'
    );
    logWarn(
      '   Only continue here if you are intentionally configuring CI for the template repo itself.'
    );
    logWarn('');
    const typed = (
      await rl.question(`Type ${repo} to confirm (anything else cancels): `)
    ).trim();
    if (typed !== repo) {
      logInfo('GitHub sync cancelled (repository name did not match).');
      return false;
    }
    return true;
  }

  if (isFork && parentRepo) {
    logInfo(`This clone is a fork; secrets go to ${repo}, not ${parentRepo}.`);
  } else if (!isFork && parentRepo) {
    logWarn(
      `Unexpected fork metadata (parent ${parentRepo}); confirm the target repo carefully.`
    );
  }

  const q = opts.dryRun
    ? `[dry-run] Proceed with GitHub sync to ${repo}? (Y/n): `
    : `Write secrets/variables to ${repo}? (Y/n): `;
  const a = (await rl.question(q)).trim().toLowerCase();
  if (a === 'n' || a === 'no') {
    logInfo('GitHub sync skipped by user.');
    return false;
  }
  return true;
}

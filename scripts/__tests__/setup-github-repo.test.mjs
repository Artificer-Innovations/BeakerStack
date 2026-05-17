import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BEAKERSTACK_TEMPLATE_GITHUB_REPO,
  confirmGithubRepoSyncTarget,
  isBeakerstackTemplateRepo,
  logGithubSyncTargetSummary,
  parseGithubOwnerRepoFromRemoteUrl,
} from '../lib/setup-github-repo.mjs';

test('parseGithubOwnerRepoFromRemoteUrl https', () => {
  assert.equal(
    parseGithubOwnerRepoFromRemoteUrl(
      'https://github.com/Artificer-Innovations/BeakerStack.git'
    ),
    'Artificer-Innovations/BeakerStack'
  );
});

test('parseGithubOwnerRepoFromRemoteUrl https without .git', () => {
  assert.equal(
    parseGithubOwnerRepoFromRemoteUrl('https://github.com/myorg/my-app'),
    'myorg/my-app'
  );
});

test('parseGithubOwnerRepoFromRemoteUrl ssh', () => {
  assert.equal(
    parseGithubOwnerRepoFromRemoteUrl('git@github.com:myorg/my-app.git'),
    'myorg/my-app'
  );
});

test('parseGithubOwnerRepoFromRemoteUrl empty', () => {
  assert.equal(parseGithubOwnerRepoFromRemoteUrl(''), '');
  assert.equal(parseGithubOwnerRepoFromRemoteUrl(null), '');
});

test('parseGithubOwnerRepoFromRemoteUrl non-github', () => {
  assert.equal(
    parseGithubOwnerRepoFromRemoteUrl('https://gitlab.com/myorg/my-app.git'),
    ''
  );
});

test('isBeakerstackTemplateRepo', () => {
  assert.ok(isBeakerstackTemplateRepo(BEAKERSTACK_TEMPLATE_GITHUB_REPO));
  assert.ok(isBeakerstackTemplateRepo('artificer-innovations/beakerstack'));
  assert.ok(!isBeakerstackTemplateRepo('myuser/BeakerStack'));
});

test('confirmGithubRepoSyncTarget skips when repo missing', async () => {
  const logs = { info: [], warn: [] };
  const ok = await confirmGithubRepoSyncTarget(
    { question: async () => 'y' },
    {
      logInfo: s => logs.info.push(s),
      logWarn: s => logs.warn.push(s),
    },
    {
      repo: '',
      isFork: false,
      parentRepo: '',
      originRepo: '',
      originUrl: '',
      repoFromOverride: false,
    },
    { dryRun: false, interactive: true }
  );
  assert.equal(ok, false);
  assert.ok(logs.warn.some(l => l.includes('No GitHub repository')));
});

test('confirmGithubRepoSyncTarget non-interactive skips without override', async () => {
  const logs = { info: [], warn: [] };
  const ok = await confirmGithubRepoSyncTarget(
    { question: async () => 'y' },
    {
      logInfo: s => logs.info.push(s),
      logWarn: s => logs.warn.push(s),
    },
    {
      repo: 'myuser/BeakerStack',
      isFork: true,
      parentRepo: BEAKERSTACK_TEMPLATE_GITHUB_REPO,
      originRepo: 'myuser/BeakerStack',
      originUrl: 'https://github.com/myuser/BeakerStack.git',
      repoFromOverride: false,
    },
    { dryRun: false, interactive: false }
  );
  assert.equal(ok, false);
  assert.ok(logs.warn.some(l => l.includes('--github-repo')));
});

test('confirmGithubRepoSyncTarget non-interactive proceeds with --github-repo override', async () => {
  const logs = { info: [], warn: [] };
  const ok = await confirmGithubRepoSyncTarget(
    { question: async () => 'y' },
    {
      logInfo: s => logs.info.push(s),
      logWarn: s => logs.warn.push(s),
    },
    {
      repo: 'myuser/BeakerStack',
      isFork: false,
      parentRepo: '',
      originRepo: 'Artificer-Innovations/BeakerStack',
      originUrl: '',
      repoFromOverride: true,
    },
    { dryRun: false, interactive: false, githubRepoOverride: true }
  );
  assert.equal(ok, true);
  assert.ok(
    logs.info.some(l => l.includes('--github-repo=myuser/BeakerStack'))
  );
});

test('confirmGithubRepoSyncTarget template rejects wrong confirmation', async () => {
  const logs = { info: [], warn: [] };
  const ok = await confirmGithubRepoSyncTarget(
    { question: async () => 'wrong-name' },
    {
      logInfo: s => logs.info.push(s),
      logWarn: s => logs.warn.push(s),
    },
    {
      repo: BEAKERSTACK_TEMPLATE_GITHUB_REPO,
      isFork: false,
      parentRepo: '',
      originRepo: BEAKERSTACK_TEMPLATE_GITHUB_REPO,
      originUrl: '',
      repoFromOverride: false,
    },
    { dryRun: false, interactive: true }
  );
  assert.equal(ok, false);
  assert.ok(logs.info.some(l => l.includes('cancelled')));
});

test('confirmGithubRepoSyncTarget template accepts exact repo name', async () => {
  const ok = await confirmGithubRepoSyncTarget(
    { question: async () => BEAKERSTACK_TEMPLATE_GITHUB_REPO },
    { logInfo: () => {}, logWarn: () => {} },
    {
      repo: BEAKERSTACK_TEMPLATE_GITHUB_REPO,
      isFork: false,
      parentRepo: '',
      originRepo: BEAKERSTACK_TEMPLATE_GITHUB_REPO,
      originUrl: '',
      repoFromOverride: false,
    },
    { dryRun: false, interactive: true }
  );
  assert.equal(ok, true);
});

test('confirmGithubRepoSyncTarget Y/n accepts default', async () => {
  const ok = await confirmGithubRepoSyncTarget(
    { question: async () => 'y' },
    {
      logInfo: () => {},
      logWarn: () => {},
    },
    {
      repo: 'myuser/BeakerStack',
      isFork: false,
      parentRepo: '',
      originRepo: 'myuser/BeakerStack',
      originUrl: '',
      repoFromOverride: false,
    },
    { dryRun: false, interactive: true }
  );
  assert.equal(ok, true);
});

test('logGithubSyncTargetSummary mentions override not gh repo view', () => {
  const logs = { info: [], warn: [] };
  logGithubSyncTargetSummary(
    {
      logInfo: s => logs.info.push(s),
      logWarn: s => logs.warn.push(s),
    },
    {
      repo: 'myuser/BeakerStack',
      isFork: false,
      parentRepo: '',
      originRepo: 'Artificer-Innovations/BeakerStack',
      originUrl: 'https://github.com/Artificer-Innovations/BeakerStack.git',
      repoFromOverride: true,
    },
    { secretCount: 2, variableCount: 1 }
  );
  assert.ok(logs.info.some(l => l.includes('--github-repo override')));
  assert.ok(!logs.warn.some(l => l.includes('gh repo view resolved')));
});

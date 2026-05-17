import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BEAKERSTACK_TEMPLATE_GITHUB_REPO,
  isBeakerstackTemplateRepo,
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

test('parseGithubOwnerRepoFromRemoteUrl ssh', () => {
  assert.equal(
    parseGithubOwnerRepoFromRemoteUrl('git@github.com:myorg/my-app.git'),
    'myorg/my-app'
  );
});

test('isBeakerstackTemplateRepo', () => {
  assert.ok(isBeakerstackTemplateRepo(BEAKERSTACK_TEMPLATE_GITHUB_REPO));
  assert.ok(isBeakerstackTemplateRepo('artificer-innovations/beakerstack'));
  assert.ok(!isBeakerstackTemplateRepo('myuser/BeakerStack'));
});

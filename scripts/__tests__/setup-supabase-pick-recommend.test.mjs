import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatSupabaseProjectChoiceLine,
  parseProjectsListJson,
  pickRecommendedSupabaseProject,
  scoreSupabaseProjectForTier,
} from '../lib/setup-supabase.mjs';

test('formatSupabaseProjectChoiceLine uses two spaces between id and name and wraps region', () => {
  const line = formatSupabaseProjectChoiceLine(3, {
    id: 'jrdootfxemiwankyxuvq',
    name: 'poststack-staging',
    region: 'us-east-1',
  });
  assert.equal(line, '[3] jrdootfxemiwankyxuvq  poststack-staging  (us-east-1)');
});

test('formatSupabaseProjectChoiceLine tolerates empty name and region', () => {
  const line = formatSupabaseProjectChoiceLine(0, { id: 'abc', name: '', region: '' });
  assert.equal(line, '[0] abc    ()');
});

test('formatSupabaseProjectChoiceLine preserves characters in name', () => {
  const line = formatSupabaseProjectChoiceLine(1, {
    id: 'x',
    name: 'Say "hi" (test)',
    region: 'eu-west-1',
  });
  assert.equal(line, '[1] x  Say "hi" (test)  (eu-west-1)');
});

test('parseProjectsListJson passes through slug when present', () => {
  const raw = JSON.stringify([
    {
      id: 'ref1',
      name: 'Dashboard label',
      slug: 'poststack-staging',
      region: 'us-east-1',
      organization_id: 'org',
    },
  ]);
  const parsed = parseProjectsListJson(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].slug, 'poststack-staging');
  assert.equal(parsed[0].name, 'Dashboard label');
});

test('parseProjectsListJson omits slug when absent or blank', () => {
  const a = parseProjectsListJson(JSON.stringify([{ id: '1', name: 'n', region: 'r' }]));
  assert.equal(a[0].slug, undefined);
  const b = parseProjectsListJson(JSON.stringify([{ id: '1', name: 'n', region: 'r', slug: '   ' }]));
  assert.equal(b[0].slug, undefined);
});

test('pickRecommendedSupabaseProject chooses poststack-staging for staging tier (sample list)', () => {
  const choices = [
    { id: 'pvavpnumwsgzapfhziag', name: 'Beaker Stack Preview', region: 'us-east-2' },
    { id: 'cnqvwitzzdcvtgivallr', name: 'Beaker Stack Staging', region: 'us-east-2' },
    { id: 'tcklysvimvxwjutqrtdm', name: 'Beaker Stack Production', region: 'us-west-2' },
    { id: 'jrdootfxemiwankyxuvq', name: 'poststack-staging', region: 'us-east-1' },
    { id: 'gwhjxqruhudyvmmzxfxt', name: 'poststack-production', region: 'us-east-1' },
    { id: 'betihfiyblklwvicyeoc', name: 'poststack-preview', region: 'us-east-1' },
  ];
  const r = pickRecommendedSupabaseProject(choices, 'staging', 'poststack');
  assert.ok(r);
  assert.equal(r.index, 3);
  assert.equal(r.project.id, 'jrdootfxemiwankyxuvq');
});

test('pickRecommendedSupabaseProject chooses production slug for production tier', () => {
  const choices = [
    { id: 'a', name: 'Beaker Stack Staging', region: 'us-east-2' },
    { id: 'b', name: 'poststack-production', region: 'us-east-1' },
  ];
  const r = pickRecommendedSupabaseProject(choices, 'production', 'poststack');
  assert.ok(r);
  assert.equal(r.index, 1);
});

test('pickRecommendedSupabaseProject prefers slug field when name differs', () => {
  const choices = [
    {
      id: 'ref99',
      name: 'Legacy label',
      slug: 'poststack-preview',
      region: 'us-west-1',
    },
    { id: 'other', name: 'poststack-preview', region: 'us-east-1' },
  ];
  const r = pickRecommendedSupabaseProject(choices, 'preview', 'poststack');
  assert.ok(r);
  assert.equal(r.index, 0);
});

test('pickRecommendedSupabaseProject tie-break keeps lower index on equal scores', () => {
  const choices = [
    { id: 'first', name: 'poststack-staging-a', region: 'r' },
    { id: 'second', name: 'poststack-staging-b', region: 'r' },
  ];
  const s0 = scoreSupabaseProjectForTier(choices[0], 'staging', 'poststack');
  const s1 = scoreSupabaseProjectForTier(choices[1], 'staging', 'poststack');
  assert.equal(s0, s1);
  const r = pickRecommendedSupabaseProject(choices, 'staging', 'poststack');
  assert.ok(r);
  assert.equal(r.index, 0);
});

test('pickRecommendedSupabaseProject returns null when nothing matches slug base', () => {
  const choices = [
    { id: 'a', name: 'Beaker Stack Preview', region: 'us-east-2' },
    { id: 'b', name: 'Other Staging', region: 'us-east-2' },
  ];
  assert.equal(pickRecommendedSupabaseProject(choices, 'staging', 'poststack'), null);
});

test('pickRecommendedSupabaseProject returns null for empty slug base', () => {
  const choices = [{ id: 'a', name: 'poststack-staging', region: 'r' }];
  assert.equal(pickRecommendedSupabaseProject(choices, 'staging', ''), null);
});

test('scoreSupabaseProjectForTier ranks exact slug field above name-only compact match', () => {
  const withSlug = { id: '1', name: 'Wrong', slug: 'poststack-staging', region: 'r' };
  const nameOnly = { id: '2', name: 'poststack-staging', region: 'r' };
  assert.ok(scoreSupabaseProjectForTier(withSlug, 'staging', 'poststack') > scoreSupabaseProjectForTier(nameOnly, 'staging', 'poststack'));
});

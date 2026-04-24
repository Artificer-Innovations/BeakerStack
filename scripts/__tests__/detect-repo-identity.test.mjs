import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { detectRepoIdentity } from '../lib/detect-repo-identity.mjs';

test('detectRepoIdentity reads branding.ts displayName and package.json author', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beaker-identity-'));
  try {
    const brandDir = join(dir, 'packages', 'shared', 'src', 'config');
    await mkdir(brandDir, { recursive: true });
    await writeFile(
      join(brandDir, 'branding.ts'),
      `export const BRANDING = {
  displayName: 'My Product',
  shortName: 'MP',
} as const;
`,
      'utf8',
    );
    await writeFile(join(dir, 'package.json'), JSON.stringify({ author: 'Legal Co, LLC' }), 'utf8');

    const r = await detectRepoIdentity(dir);
    assert.equal(r.displayName, 'My Product');
    assert.equal(r.legalAuthor, 'Legal Co, LLC');
    assert.equal(r.warnings.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('detectRepoIdentity falls back when files are missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'beaker-identity-empty-'));
  try {
    const r = await detectRepoIdentity(dir);
    assert.equal(r.displayName, 'Beaker Stack');
    assert.equal(r.legalAuthor, 'Artificer Innovations, LLC');
    assert.ok(r.warnings.length >= 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

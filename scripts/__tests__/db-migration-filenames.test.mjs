import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');
const MIGRATION_FILENAME_RE = /^(\d{14})_(.+)\.sql$/;

async function getSqlMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
    .map(entry => entry.name)
    .sort();
}

test('all SQL migrations use the expected timestamped filename format', async () => {
  const files = await getSqlMigrationFiles();
  const invalid = files.filter(name => !MIGRATION_FILENAME_RE.test(name));
  assert.deepEqual(
    invalid,
    [],
    `Invalid migration filename(s): ${invalid.join(', ')}. Expected: YYYYMMDDHHMMSS_description.sql`
  );
});

test('migration version prefixes are unique', async () => {
  const files = await getSqlMigrationFiles();
  const seen = new Map();
  const duplicates = [];

  for (const name of files) {
    const match = name.match(MIGRATION_FILENAME_RE);
    if (!match) continue;
    const version = match[1];
    const current = seen.get(version);
    if (current) {
      duplicates.push(`${version}: ${current}, ${name}`);
      continue;
    }
    seen.set(version, name);
  }

  assert.deepEqual(
    duplicates,
    [],
    `Duplicate migration version prefix(es) found: ${duplicates.join(' | ')}`
  );
});

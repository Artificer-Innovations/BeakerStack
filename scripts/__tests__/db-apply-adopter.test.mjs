import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listMigrationFiles,
  pendingMigrations,
  sha256,
} from '../db-apply-adopter.mjs';

test('pendingMigrations returns files not yet applied', () => {
  const all = ['20260101000000_a.sql', '20260102000000_b.sql'];
  const applied = ['20260101000000_a.sql'];
  assert.deepEqual(pendingMigrations(all, applied), ['20260102000000_b.sql']);
});

test('sha256 is stable', () => {
  assert.equal(
    sha256('CREATE TABLE app.demo (id uuid);'),
    sha256('CREATE TABLE app.demo (id uuid);')
  );
});

test('listMigrationFiles returns sorted sql files', () => {
  const files = listMigrationFiles(
    new URL('../fixtures/adopter-migrations', import.meta.url).pathname
  );
  assert.deepEqual(files, [
    '20260101000000_first.sql',
    '20260102000000_second.sql',
  ]);
});

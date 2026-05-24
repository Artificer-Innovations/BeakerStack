import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  assertPostgresUrl,
  isPostgresUrl,
  readLinkedProjectRef,
  resolveAdopterDatabaseUrl,
  resolveLinkedCredentials,
} from '../lib/resolve-adopter-database-url.mjs';

test('isPostgresUrl accepts postgres and postgresql schemes', () => {
  assert.equal(isPostgresUrl('postgresql://user:pass@host:5432/db'), true);
  assert.equal(isPostgresUrl('postgres://user:pass@host:5432/db'), true);
  assert.equal(isPostgresUrl('Manage remote databases'), false);
});

test('assertPostgresUrl rejects non-Postgres values', () => {
  assert.throws(
    () => assertPostgresUrl('Manage remote databases'),
    /not a Postgres connection string/
  );
});

test('resolveLinkedCredentials prefers generic env vars', () => {
  const creds = resolveLinkedCredentials({
    SUPABASE_PROJECT_REF: 'generic-ref',
    SUPABASE_DB_PASSWORD: 'generic-pass',
    STAGING_SUPABASE_PROJECT_REF: 'staging-ref',
    STAGING_SUPABASE_DB_PASSWORD: 'staging-pass',
  });
  assert.deepEqual(creds, {
    projectRef: 'generic-ref',
    dbPassword: 'generic-pass',
  });
});

test('resolveLinkedCredentials uses staging env vars', () => {
  const creds = resolveLinkedCredentials({
    STAGING_SUPABASE_PROJECT_REF: 'staging-ref',
    STAGING_SUPABASE_DB_PASSWORD: 'staging-pass',
  });
  assert.deepEqual(creds, {
    projectRef: 'staging-ref',
    dbPassword: 'staging-pass',
  });
});

test('resolveLinkedCredentials uses production env vars', () => {
  const creds = resolveLinkedCredentials({
    PRODUCTION_SUPABASE_PROJECT_REF: 'prod-ref',
    PRODUCTION_SUPABASE_DB_PASSWORD: 'prod-pass',
  });
  assert.deepEqual(creds, {
    projectRef: 'prod-ref',
    dbPassword: 'prod-pass',
  });
});

test('resolveLinkedCredentials returns empty object when incomplete', () => {
  assert.deepEqual(
    resolveLinkedCredentials({
      STAGING_SUPABASE_PROJECT_REF: 'staging-ref',
    }),
    {}
  );
});

test('resolveAdopterDatabaseUrl linked uses staging secrets', () => {
  const url = resolveAdopterDatabaseUrl({
    linked: true,
    env: {
      STAGING_SUPABASE_PROJECT_REF: 'abc123staging',
      STAGING_SUPABASE_DB_PASSWORD: 'p@ss&word',
    },
  });
  assert.equal(
    url,
    'postgresql://postgres:p%40ss%26word@db.abc123staging.supabase.co:5432/postgres'
  );
});

test('resolveAdopterDatabaseUrl linked uses production secrets', () => {
  const url = resolveAdopterDatabaseUrl({
    linked: true,
    env: {
      PRODUCTION_SUPABASE_PROJECT_REF: 'abc123prod',
      PRODUCTION_SUPABASE_DB_PASSWORD: 'secret',
    },
  });
  assert.equal(
    url,
    'postgresql://postgres:secret@db.abc123prod.supabase.co:5432/postgres'
  );
});

test('resolveAdopterDatabaseUrl prefers DATABASE_URL override', () => {
  const url = resolveAdopterDatabaseUrl({
    linked: true,
    env: {
      DATABASE_URL:
        'postgresql://postgres:override@db.custom.supabase.co:5432/postgres',
      STAGING_SUPABASE_PROJECT_REF: 'ignored',
      STAGING_SUPABASE_DB_PASSWORD: 'ignored',
    },
  });
  assert.equal(
    url,
    'postgresql://postgres:override@db.custom.supabase.co:5432/postgres'
  );
});

test('resolveAdopterDatabaseUrl linked throws when credentials missing', () => {
  assert.throws(
    () => resolveAdopterDatabaseUrl({ linked: true, env: {} }),
    /Failed to resolve remote database URL for --linked/
  );
});

test('resolveAdopterDatabaseUrl linked rejects invalid DATABASE_URL', () => {
  assert.throws(
    () =>
      resolveAdopterDatabaseUrl({
        linked: true,
        env: { DATABASE_URL: 'not-a-postgres-url' },
      }),
    /not a Postgres connection string/
  );
});

test('resolveAdopterDatabaseUrl local defaults to local Supabase', () => {
  const url = resolveAdopterDatabaseUrl({ linked: false, env: {} });
  assert.equal(url, 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');
});

test('resolveAdopterDatabaseUrl local uses SUPABASE_DB_URL', () => {
  const url = resolveAdopterDatabaseUrl({
    linked: false,
    env: {
      SUPABASE_DB_URL: 'postgresql://postgres:local@127.0.0.1:54322/postgres',
    },
  });
  assert.equal(url, 'postgresql://postgres:local@127.0.0.1:54322/postgres');
});

test('readLinkedProjectRef uses supabase/.temp/project-ref fallback', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const tempDir = path.join(repoRoot, 'supabase', '.temp');
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(path.join(tempDir, 'project-ref'), 'linked-ref\n');

  const url = readLinkedProjectRef(repoRoot, {
    SUPABASE_DB_PASSWORD: 'linked-pass',
  });
  assert.equal(
    url,
    'postgresql://postgres:linked-pass@db.linked-ref.supabase.co:5432/postgres'
  );
});

test('resolveAdopterDatabaseUrl linked falls back to linked project ref file', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const tempDir = path.join(repoRoot, 'supabase', '.temp');
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(path.join(tempDir, 'project-ref'), 'linked-ref\n');

  const url = resolveAdopterDatabaseUrl({
    linked: true,
    repoRoot,
    env: { SUPABASE_DB_PASSWORD: 'linked-pass' },
  });
  assert.equal(
    url,
    'postgresql://postgres:linked-pass@db.linked-ref.supabase.co:5432/postgres'
  );
});

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  assertPostgresUrl,
  buildLinkedConnectionUri,
  isPostgresUrl,
  isScriptMain,
  readLinkedConnectionUri,
  readPoolerUrlTemplate,
  resolveAdopterDatabaseUrl,
  resolveLinkedCredentials,
} from '../lib/resolve-adopter-database-url.mjs';
import { applyPoolerPassword } from '../lib/setup-supabase.mjs';

test('isPostgresUrl accepts postgres and postgresql schemes', () => {
  assert.equal(isPostgresUrl('postgresql://user:pass@host:5432/db'), true);
  assert.equal(isPostgresUrl('postgres://user:pass@host:5432/db'), true);
  assert.equal(isPostgresUrl('Manage remote databases'), false);
});

test('assertPostgresUrl rejects non-Postgres values', () => {
  assert.throws(
    () => assertPostgresUrl('Manage remote databases'),
    /not a Postgres connection string: Manage remote databases/
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

test('resolveLinkedCredentials uses preview env vars', () => {
  const creds = resolveLinkedCredentials({
    SUPABASE_PREVIEW_PROJECT_REF: 'preview-ref',
    SUPABASE_PREVIEW_DB_PASSWORD: 'preview-pass',
  });
  assert.deepEqual(creds, {
    projectRef: 'preview-ref',
    dbPassword: 'preview-pass',
  });
});

test('resolveLinkedCredentials prefers generic env vars over preview', () => {
  const creds = resolveLinkedCredentials({
    SUPABASE_PROJECT_REF: 'generic-ref',
    SUPABASE_DB_PASSWORD: 'generic-pass',
    SUPABASE_PREVIEW_PROJECT_REF: 'preview-ref',
    SUPABASE_PREVIEW_DB_PASSWORD: 'preview-pass',
  });
  assert.deepEqual(creds, {
    projectRef: 'generic-ref',
    dbPassword: 'generic-pass',
  });
});

test('resolveAdopterDatabaseUrl linked uses preview secrets', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const url = resolveAdopterDatabaseUrl({
    linked: true,
    repoRoot,
    env: {
      SUPABASE_PREVIEW_PROJECT_REF: 'abc123preview',
      SUPABASE_PREVIEW_DB_PASSWORD: 'secret',
    },
  });
  assert.equal(
    url,
    'postgresql://postgres:secret@db.abc123preview.supabase.co:5432/postgres?sslmode=require'
  );
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

test('resolveLinkedCredentials trims dbPassword whitespace', () => {
  const creds = resolveLinkedCredentials({
    SUPABASE_PROJECT_REF: 'abc123',
    SUPABASE_DB_PASSWORD: '  secret\n',
  });
  assert.deepEqual(creds, {
    projectRef: 'abc123',
    dbPassword: 'secret',
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
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const url = resolveAdopterDatabaseUrl({
    linked: true,
    repoRoot,
    env: {
      STAGING_SUPABASE_PROJECT_REF: 'abc123staging',
      STAGING_SUPABASE_DB_PASSWORD: 'p@ss&word',
    },
  });
  assert.equal(
    url,
    'postgresql://postgres:p%40ss%26word@db.abc123staging.supabase.co:5432/postgres?sslmode=require'
  );
});

test('resolveAdopterDatabaseUrl linked prefers Supavisor pooler URL from supabase link', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const tempDir = path.join(repoRoot, 'supabase', '.temp');
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(
    path.join(tempDir, 'pooler-url'),
    'postgresql://postgres.abc123staging@aws-1-us-east-2.pooler.supabase.com:5432/postgres\n'
  );

  const url = resolveAdopterDatabaseUrl({
    linked: true,
    repoRoot,
    env: {
      STAGING_SUPABASE_PROJECT_REF: 'abc123staging',
      STAGING_SUPABASE_DB_PASSWORD: 'p@ss&word',
    },
  });
  assert.equal(
    url,
    'postgresql://postgres.abc123staging:p%40ss%26word@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require'
  );
});

test('resolveAdopterDatabaseUrl linked uses production secrets', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const url = resolveAdopterDatabaseUrl({
    linked: true,
    repoRoot,
    env: {
      PRODUCTION_SUPABASE_PROJECT_REF: 'abc123prod',
      PRODUCTION_SUPABASE_DB_PASSWORD: 'secret',
    },
  });
  assert.equal(
    url,
    'postgresql://postgres:secret@db.abc123prod.supabase.co:5432/postgres?sslmode=require'
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
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-empty-'));
  assert.throws(
    () => resolveAdopterDatabaseUrl({ linked: true, env: {}, repoRoot }),
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
    /not a Postgres connection string: not-a-postgres-url/
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

test('readLinkedConnectionUri uses supabase/.temp/project-ref fallback', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const tempDir = path.join(repoRoot, 'supabase', '.temp');
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(path.join(tempDir, 'project-ref'), 'linked-ref\n');

  const url = readLinkedConnectionUri(repoRoot, {
    SUPABASE_DB_PASSWORD: 'linked-pass',
  });
  assert.equal(
    url,
    'postgresql://postgres:linked-pass@db.linked-ref.supabase.co:5432/postgres?sslmode=require'
  );
});

test('readLinkedConnectionUri throws when project-ref exists without password', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const tempDir = path.join(repoRoot, 'supabase', '.temp');
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(path.join(tempDir, 'project-ref'), 'linked-ref\n');

  assert.throws(
    () => readLinkedConnectionUri(repoRoot, {}),
    /SUPABASE_DB_PASSWORD is not set/
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
    'postgresql://postgres:linked-pass@db.linked-ref.supabase.co:5432/postgres?sslmode=require'
  );
});

test('applyPoolerPassword injects password and sslmode', () => {
  const url = applyPoolerPassword(
    'postgresql://postgres.linked-ref@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    'p@ss&word'
  );
  assert.equal(
    url,
    'postgresql://postgres.linked-ref:p%40ss%26word@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require'
  );
});

test('readPoolerUrlTemplate reads supabase/.temp/pooler-url', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const tempDir = path.join(repoRoot, 'supabase', '.temp');
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(
    path.join(tempDir, 'pooler-url'),
    'postgresql://postgres.linked-ref@aws-1-us-east-2.pooler.supabase.com:5432/postgres'
  );

  assert.equal(
    readPoolerUrlTemplate(repoRoot),
    'postgresql://postgres.linked-ref@aws-1-us-east-2.pooler.supabase.com:5432/postgres'
  );
});

test('buildLinkedConnectionUri prefers pooler template when present', () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'adopter-db-'));
  const tempDir = path.join(repoRoot, 'supabase', '.temp');
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(
    path.join(tempDir, 'pooler-url'),
    'postgresql://postgres.linked-ref@aws-1-us-east-2.pooler.supabase.com:5432/postgres'
  );

  const url = buildLinkedConnectionUri(repoRoot, 'secret', 'linked-ref');
  assert.match(url, /pooler\.supabase\.com/);
  assert.match(url, /sslmode=require/);
});

test('isScriptMain returns true when argv matches import meta url', () => {
  const scriptPath = fileURLToPath(import.meta.url);
  assert.equal(isScriptMain(import.meta.url, scriptPath), true);
});

test('isScriptMain returns false for a different path', () => {
  assert.equal(isScriptMain(import.meta.url, '/some/other/script.mjs'), false);
});

test('isScriptMain returns false when argv is missing', () => {
  assert.equal(isScriptMain(import.meta.url, ''), false);
});

import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Resolve Postgres URL for adopter db scripts.
 * @param {{ linked?: boolean; repoRoot?: string }} [options]
 * @returns {string}
 */
export function resolveAdopterDatabaseUrl(options = {}) {
  const { linked = false, repoRoot = process.cwd() } = options;

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (linked) {
    const connection = spawnSync(
      'supabase',
      ['db', 'remote', 'connection-string'],
      { cwd: repoRoot, encoding: 'utf8' }
    );
    if (connection.status !== 0) {
      throw new Error(
        'Failed to resolve remote connection string via supabase CLI'
      );
    }
    const url = connection.stdout.trim();
    if (!url) {
      throw new Error(
        'supabase db remote connection-string returned empty output'
      );
    }
    return url;
  }

  return (
    process.env.SUPABASE_DB_URL ??
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  );
}

/**
 * @param {string} importMetaUrl
 * @param {string} [argvScript=process.argv[1]]
 * @returns {boolean}
 */
export function isScriptMain(importMetaUrl, argvScript = process.argv[1]) {
  if (!argvScript) {
    return false;
  }
  return (
    path.resolve(fileURLToPath(importMetaUrl)) === path.resolve(argvScript)
  );
}

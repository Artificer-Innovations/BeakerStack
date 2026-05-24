#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const initSqlPath = path.join(repoRoot, 'adopter', 'db', 'init.sql');

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const local =
    process.env.SUPABASE_DB_URL ??
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  return local;
}

function runPsql(databaseUrl, sqlFile) {
  const result = spawnSync(
    'psql',
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', sqlFile],
    { stdio: 'inherit', encoding: 'utf8' }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const linked = args.includes('--linked');
  let databaseUrl = resolveDatabaseUrl();

  if (linked) {
    const connection = spawnSync(
      'supabase',
      ['db', 'remote', 'connection-string'],
      { cwd: repoRoot, encoding: 'utf8' }
    );
    if (connection.status !== 0) {
      console.error(
        'Failed to resolve remote connection string via supabase CLI'
      );
      process.exit(connection.status ?? 1);
    }
    databaseUrl = connection.stdout.trim();
    if (!databaseUrl) {
      console.error(
        'supabase db remote connection-string returned empty output'
      );
      process.exit(1);
    }
  }

  if (!readFileSync(initSqlPath, 'utf8').trim()) {
    console.error('adopter/db/init.sql is empty');
    process.exit(1);
  }

  console.log(`Applying adopter db init (${linked ? 'linked' : 'local'})...`);
  runPsql(databaseUrl, initSqlPath);
  console.log('db:init-adopter complete');
}

main();

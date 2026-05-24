#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  isScriptMain,
  resolveAdopterDatabaseUrl,
} from './lib/resolve-adopter-database-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const initSqlPath = path.join(repoRoot, 'adopter', 'db', 'init.sql');

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
  const linked = process.argv.includes('--linked');
  const databaseUrl = resolveAdopterDatabaseUrl({ linked, repoRoot });

  if (!readFileSync(initSqlPath, 'utf8').trim()) {
    console.error('adopter/db/init.sql is empty');
    process.exit(1);
  }

  console.log(`Applying adopter db init (${linked ? 'linked' : 'local'})...`);
  runPsql(databaseUrl, initSqlPath);
  console.log('db:init-adopter complete');
}

if (isScriptMain(import.meta.url)) {
  main();
}

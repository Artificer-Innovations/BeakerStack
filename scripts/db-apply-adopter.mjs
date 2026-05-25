#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
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
const migrationsDir = path.join(repoRoot, 'adopter', 'db', 'migrations');
const initSqlPath = path.join(repoRoot, 'adopter', 'db', 'init.sql');

export function listMigrationFiles(migrationsPath = migrationsDir) {
  try {
    return readdirSync(migrationsPath)
      .filter(name => name.endsWith('.sql'))
      .sort();
  } catch {
    return [];
  }
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function parseAppliedRows(psqlOutput) {
  return psqlOutput
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

export function pendingMigrations(allFiles, applied) {
  const appliedSet = new Set(applied);
  return allFiles.filter(file => !appliedSet.has(file));
}

function runPsql(databaseUrl, args, input) {
  const result = spawnSync(
    'psql',
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', ...args],
    {
      input,
      encoding: 'utf8',
    }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'psql failed');
  }
  return result.stdout;
}

function ensureInit(databaseUrl) {
  runPsql(databaseUrl, ['-f', initSqlPath]);
}

function fetchApplied(databaseUrl) {
  const output = runPsql(databaseUrl, [
    '-t',
    '-A',
    '-c',
    'SELECT filename FROM app.schema_migrations ORDER BY filename;',
  ]);
  return parseAppliedRows(output);
}

function applyMigration(databaseUrl, filename, content) {
  const checksum = sha256(content);
  const sql = `
BEGIN;
${content}
INSERT INTO app.schema_migrations (filename, checksum)
VALUES ('${filename.replace(/'/g, "''")}', '${checksum}')
ON CONFLICT (filename) DO NOTHING;
COMMIT;
`;
  runPsql(databaseUrl, [], sql);
}

export function applyAdopterMigrations(options = {}) {
  const linked = options.linked ?? false;
  const dryRun = options.dryRun ?? false;
  const databaseUrl = resolveAdopterDatabaseUrl({ linked, repoRoot });
  ensureInit(databaseUrl);

  const allFiles = listMigrationFiles(options.migrationsDir);
  const applied = fetchApplied(databaseUrl);
  const pending = pendingMigrations(allFiles, applied);

  for (const filename of pending) {
    if (dryRun) {
      console.log(`Would apply ${filename}`);
      continue;
    }

    const filePath = path.join(
      options.migrationsDir ?? migrationsDir,
      filename
    );
    const content = readFileSync(filePath, 'utf8');
    try {
      applyMigration(databaseUrl, filename, content);
      console.log(`Applied ${filename}`);
    } catch (error) {
      console.error(`Failed applying ${filename}:`, error.message);
      process.exitCode = 1;
      break;
    }
  }

  if (pending.length === 0) {
    console.log('No pending adopter migrations');
  } else if (dryRun) {
    console.log(`Dry run complete — ${pending.length} pending migration(s)`);
  }
}

function main() {
  const linked = process.argv.includes('--linked');
  const dryRun = process.argv.includes('--dry-run');
  applyAdopterMigrations({ linked, dryRun });
}

if (isScriptMain(import.meta.url)) {
  main();
}

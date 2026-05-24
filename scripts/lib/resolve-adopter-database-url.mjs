import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  applyPoolerPassword,
  postgresConnectionUri,
} from './setup-supabase.mjs';

const LOCAL_DEFAULT_URL =
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isPostgresUrl(url) {
  return /^postgres(?:ql)?:\/\//.test(url);
}

/**
 * @param {string} url
 * @returns {string}
 */
export function assertPostgresUrl(url) {
  if (!isPostgresUrl(url)) {
    throw new Error(
      `Resolved database URL is not a Postgres connection string: ${String(url).slice(0, 80)}`
    );
  }
  return url;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ projectRef?: string; dbPassword?: string }}
 */
export function resolveLinkedCredentials(env = process.env) {
  // PREVIEW_SUPABASE_* is intentionally omitted — PR preview does not run adopter
  // migrations today. Add a pair here if that workflow starts calling --linked.
  const pairs = [
    ['SUPABASE_PROJECT_REF', 'SUPABASE_DB_PASSWORD'],
    ['STAGING_SUPABASE_PROJECT_REF', 'STAGING_SUPABASE_DB_PASSWORD'],
    ['PRODUCTION_SUPABASE_PROJECT_REF', 'PRODUCTION_SUPABASE_DB_PASSWORD'],
  ];

  for (const [refKey, passwordKey] of pairs) {
    const projectRef = env[refKey]?.trim();
    const dbPassword = env[passwordKey]?.trim();
    if (projectRef && dbPassword) {
      return { projectRef, dbPassword };
    }
  }

  return {};
}

/**
 * @param {string} repoRoot
 * @returns {string | undefined}
 */
export function readPoolerUrlTemplate(repoRoot) {
  const poolerPath = path.join(repoRoot, 'supabase', '.temp', 'pooler-url');
  if (!existsSync(poolerPath)) {
    return undefined;
  }

  const template = readFileSync(poolerPath, 'utf8').trim();
  return template || undefined;
}

/**
 * Prefer Supavisor pooler URL (IPv4-compatible) when `supabase link` wrote
 * supabase/.temp/pooler-url; fall back to direct db.{ref}.supabase.co.
 *
 * @param {string} repoRoot
 * @param {string} dbPassword
 * @param {string} projectRef
 * @returns {string}
 */
export function buildLinkedConnectionUri(repoRoot, dbPassword, projectRef) {
  const poolerTemplate = readPoolerUrlTemplate(repoRoot);
  if (poolerTemplate) {
    return applyPoolerPassword(poolerTemplate, dbPassword);
  }

  return postgresConnectionUri(projectRef, dbPassword);
}

/**
 * Local-dev fallback after `supabase link`: read project ref from disk and pair
 * with SUPABASE_DB_PASSWORD only (not STAGING_/PRODUCTION_ variants).
 *
 * @param {string} repoRoot
 * @param {NodeJS.ProcessEnv} env
 * @returns {string | undefined}
 */
export function readLinkedConnectionUri(repoRoot, env = process.env) {
  const refPath = path.join(repoRoot, 'supabase', '.temp', 'project-ref');
  if (!existsSync(refPath)) {
    return undefined;
  }

  const projectRef = readFileSync(refPath, 'utf8').trim();
  if (!projectRef) {
    return undefined;
  }

  const dbPassword = env.SUPABASE_DB_PASSWORD?.trim();
  if (!dbPassword) {
    throw new Error(
      'Found supabase/.temp/project-ref from supabase link but SUPABASE_DB_PASSWORD is not set. The file fallback uses the generic password var only — set SUPABASE_DB_PASSWORD or use STAGING_/PRODUCTION_ env pairs instead.'
    );
  }

  return buildLinkedConnectionUri(repoRoot, dbPassword, projectRef);
}

/**
 * Resolve Postgres URL for adopter db scripts.
 * @param {{ linked?: boolean; repoRoot?: string; env?: NodeJS.ProcessEnv }} [options]
 * @returns {string}
 */
export function resolveAdopterDatabaseUrl(options = {}) {
  const {
    linked = false,
    repoRoot = process.cwd(),
    env = process.env,
  } = options;

  if (env.DATABASE_URL) {
    return assertPostgresUrl(env.DATABASE_URL);
  }

  if (linked) {
    const { projectRef, dbPassword } = resolveLinkedCredentials(env);
    if (projectRef && dbPassword) {
      return assertPostgresUrl(
        buildLinkedConnectionUri(repoRoot, dbPassword, projectRef)
      );
    }

    const linkedUrl = readLinkedConnectionUri(repoRoot, env);
    if (linkedUrl) {
      return assertPostgresUrl(linkedUrl);
    }

    throw new Error(
      'Failed to resolve remote database URL for --linked. Set DATABASE_URL or project ref + DB password env vars (SUPABASE_*, STAGING_SUPABASE_*, or PRODUCTION_SUPABASE_*).'
    );
  }

  const localUrl = env.SUPABASE_DB_URL ?? LOCAL_DEFAULT_URL;
  return assertPostgresUrl(localUrl);
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

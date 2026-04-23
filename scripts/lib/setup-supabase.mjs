import { spawn } from 'node:child_process';

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string; env?: NodeJS.ProcessEnv }} [opts]
 * @returns {Promise<{ stdout: string; stderr: string; code: number }>}
 */
export function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const merged = { ...process.env, ...(opts.env || {}) };
    if (merged.AWS_PROFILE === '') {
      delete merged.AWS_PROFILE;
    }
    if (merged.AWS_DEFAULT_PROFILE === '') {
      delete merged.AWS_DEFAULT_PROFILE;
    }
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: merged,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

/**
 * @param {string} projectRef
 * @param {string} dbPassword
 */
export function postgresConnectionUri(projectRef, dbPassword) {
  const enc = encodeURIComponent(dbPassword);
  return `postgresql://postgres:${enc}@db.${projectRef}.supabase.co:5432/postgres`;
}

/**
 * @param {string} projectRef
 */
export function projectApiUrl(projectRef) {
  return `https://${projectRef}.supabase.co`;
}

/**
 * @param {string} json
 * @param {boolean} [silentKeys]
 */
export function parseApiKeysJson(json) {
  const data = JSON.parse(json);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.anon === 'string' && typeof data.service_role === 'string') {
      return { anon: data.anon, service_role: data.service_role };
    }
  }
  const list = Array.isArray(data) ? data : data.keys || data.api_keys || [];
  /** @type {Record<string, string>} */
  const out = {};
  for (const row of list) {
    const name = row.name || row.id || row.role;
    const key = row.api_key || row.apiKey || row.key;
    if (name && key) out[String(name)] = String(key);
  }
  return {
    anon: out.anon || out['anon key'] || '',
    service_role: out.service_role || out.serviceRole || out['service_role'] || '',
  };
}

/**
 * @typedef {{ id: string; name: string; region: string; organization_id?: string; slug?: string }} SupabaseProjectChoice
 */

/**
 * @param {number} index
 * @param {SupabaseProjectChoice} project
 */
export function formatSupabaseProjectChoiceLine(index, project) {
  const id = project.id != null ? String(project.id) : '';
  const name = project.name != null ? String(project.name) : '';
  const region = project.region != null ? String(project.region) : '';
  return `[${index}] ${id}  ${name}  (${region})`;
}

/**
 * @param {string} s
 */
function normalizeSlugLike(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * @param {string} s
 */
function compactAlnum(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string} name
 * @param {'staging'|'production'|'preview'} tier
 */
function wholeWordTier(name, tier) {
  return new RegExp(`\\b${tier}\\b`, 'i').test(name);
}

/** Minimum score to emit a recommendation (avoids noisy weak matches). */
const RECOMMEND_MIN_SCORE = 40;

/**
 * @param {SupabaseProjectChoice} project
 * @param {'staging'|'production'|'preview'} tier
 * @param {string} slugBase
 */
export function scoreSupabaseProjectForTier(project, tier, slugBase) {
  const base = String(slugBase || '').toLowerCase();
  if (!base) return 0;
  const expected = `${base}-${tier}`;
  const slugField = project.slug != null ? String(project.slug).trim().toLowerCase() : '';
  if (slugField && slugField === expected) return 100;

  const displayName = String(project.name || '').trim();
  if (normalizeSlugLike(displayName) === expected) return 88;
  if (displayName.toLowerCase() === expected) return 88;

  const compactName = compactAlnum(displayName);
  const compactSlug = compactAlnum(slugField);
  const compact = `${compactName}${compactSlug}`;
  const needle = `${base}${tier}`;
  if (compact.includes(needle)) return 70;

  if (wholeWordTier(displayName, tier) && compactName.includes(base)) return 45;

  return 0;
}

/**
 * @param {SupabaseProjectChoice[]} choices
 * @param {'staging'|'production'|'preview'} tier
 * @param {string} slugBase
 * @returns {{ index: number; project: SupabaseProjectChoice } | null}
 */
export function pickRecommendedSupabaseProject(choices, tier, slugBase) {
  if (!Array.isArray(choices) || choices.length === 0) return null;
  let bestIdx = -1;
  let bestScore = -1;
  for (let i = 0; i < choices.length; i += 1) {
    const sc = scoreSupabaseProjectForTier(choices[i], tier, slugBase);
    if (sc > bestScore) {
      bestScore = sc;
      bestIdx = i;
    }
  }
  if (bestIdx < 0 || bestScore < RECOMMEND_MIN_SCORE) return null;
  return { index: bestIdx, project: choices[bestIdx] };
}

/**
 * @param {string} stdout
 * @returns {SupabaseProjectChoice[]}
 */
export function parseProjectsListJson(stdout) {
  const data = JSON.parse(stdout);
  if (!Array.isArray(data)) return [];
  return data.map((p) => {
    const rawSlug = p.slug;
    const slug =
      typeof rawSlug === 'string' && rawSlug.trim() ? String(rawSlug).trim() : undefined;
    return {
      id: p.id || p.ref || p.project_id,
      name: p.name || p.slug || '',
      region: p.region || '',
      organization_id: p.organization_id || p.org_id,
      slug,
    };
  });
}

/**
 * @param {string} stdout
 */
export function parseOrgsListJson(stdout) {
  const data = JSON.parse(stdout);
  if (!Array.isArray(data)) return [];
  return data.map((o) => ({
    id: o.id,
    name: o.name || '',
  }));
}

/**
 * @param {string} stdout
 */
export function parseProjectCreateJson(stdout) {
  const data = JSON.parse(stdout);
  const id =
    data.id ||
    data.ref ||
    data.project_id ||
    data.project_ref ||
    (data.project && (data.project.id || data.project.ref));
  if (!id) throw new Error('Could not parse new project id from Supabase CLI output');
  return { id: String(id), raw: data };
}

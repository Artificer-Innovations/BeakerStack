#!/usr/bin/env node
// Build all manifest ports into supabase/functions/_shared/_generated/.
// Run: node scripts/sync-edge-shared.mjs
// See: supabase/functions/edge-shared.manifest.json

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function log(...args) {
  console.log('[sync-edge-shared]', ...args);
}

function die(msg) {
  console.error('[sync-edge-shared] ERROR:', msg);
  process.exit(1);
}

// ── Manifest loading ──────────────────────────────────────────────────────────

function loadManifest() {
  const path = resolve(ROOT, 'supabase/functions/edge-shared.manifest.json');
  if (!existsSync(path)) die(`Manifest not found: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    die(`Failed to parse manifest: ${e.message}`);
  }
}

// ── Topological sort ──────────────────────────────────────────────────────────

function topoSort(ports) {
  const byId = new Map(ports.map(p => [p.id, p]));
  const visited = new Set();
  const visiting = new Set();
  const order = [];

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      // Trace cycle
      const cycle = [...visiting, id];
      die(`Cycle detected in dependsOn: ${cycle.join(' → ')}`);
    }
    visiting.add(id);
    const port = byId.get(id);
    if (!port) die(`Unknown port id in dependsOn: "${id}"`);
    for (const dep of port.dependsOn ?? []) {
      visit(dep);
    }
    visiting.delete(id);
    visited.add(id);
    order.push(port);
  }

  for (const port of ports) visit(port.id);
  return order;
}

// ── tsup build ────────────────────────────────────────────────────────────────

function buildPort(port) {
  const pkgDir = resolve(ROOT, port.package);
  const configPath = resolve(pkgDir, port.tsupConfig);
  const outDir = resolve(ROOT, port.outDir);

  if (!existsSync(configPath)) {
    die(`tsup config not found: ${configPath}`);
  }

  const tsupBin = resolve(ROOT, 'node_modules/.bin/tsup');
  if (!existsSync(tsupBin)) die('tsup not found in node_modules/.bin/tsup — run npm install');

  log(`Building ${port.id} (${port.package}) → ${port.outDir}`);

  try {
    execSync(
      `"${tsupBin}" --config "${configPath}" --out-dir "${outDir}" --clean`,
      { cwd: pkgDir, stdio: 'inherit' }
    );
  } catch (e) {
    die(`tsup failed for port "${port.id}": ${e.message}`);
  }
}

// ── Import map validation ─────────────────────────────────────────────────────

function validateImportMap(ports) {
  const denoJsonPath = resolve(ROOT, 'supabase/functions/deno.json');
  if (!existsSync(denoJsonPath)) {
    log('No deno.json found — skipping import map validation');
    return;
  }

  let denoJson;
  try {
    denoJson = JSON.parse(readFileSync(denoJsonPath, 'utf8'));
  } catch (e) {
    die(`Failed to parse deno.json: ${e.message}`);
  }

  const imports = denoJson.imports ?? {};
  let errors = 0;

  for (const port of ports) {
    const entryBase = basename(port.entry, '.ts') + '.js';
    const expectedRelPath =
      './' + port.outDir.replace(/^supabase\/functions\//, '') + '/' + entryBase;

    const mappedPath = imports[port.npmName];
    if (!mappedPath) {
      console.error(
        `[sync-edge-shared] WARN: ${port.npmName} has no entry in deno.json imports`
      );
      continue;
    }

    // Resolve mapped path relative to supabase/functions
    const resolvedMapped = resolve(ROOT, 'supabase/functions', mappedPath);
    if (!existsSync(resolvedMapped)) {
      console.error(
        `[sync-edge-shared] ERROR: import map entry for ${port.npmName} points to missing file: ${resolvedMapped}`
      );
      errors++;
    }
  }

  if (errors > 0) die(`${errors} import map validation error(s) — check output above`);
  log('Import map validated OK');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const manifest = loadManifest();
const { ports } = manifest;

if (!Array.isArray(ports) || ports.length === 0) {
  die('Manifest has no ports');
}

const ordered = topoSort(ports);

log(`Building ${ordered.length} port(s) in dependency order…`);

for (const port of ordered) {
  buildPort(port);
}

validateImportMap(ports);

log(`Done. ${ordered.length} port(s) built successfully.`);

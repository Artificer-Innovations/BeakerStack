#!/usr/bin/env node
// Build all manifest ports into supabase/functions/_shared/_generated/.
// Run: node scripts/sync-edge-shared.mjs
// See: supabase/functions/edge-shared.manifest.json

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

function log(...args) {
  console.log('[sync-edge-shared]', ...args);
}

function die(msg) {
  console.error('[sync-edge-shared] ERROR:', msg);
  process.exit(1);
}

// ── Manifest loading ──────────────────────────────────────────────────────────

export function parseManifest(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data.ports))
    throw new Error('manifest.ports must be an array');
  for (const p of data.ports) {
    if (!p.id) throw new Error('port missing required field "id"');
    if (!p.package) throw new Error(`port ${p.id} missing "package"`);
    if (!p.entry) throw new Error(`port ${p.id} missing "entry"`);
    if (!p.tsupConfig) throw new Error(`port ${p.id} missing "tsupConfig"`);
    if (!p.outDir) throw new Error(`port ${p.id} missing "outDir"`);
    if (!p.npmName) throw new Error(`port ${p.id} missing "npmName"`);
  }
  return data;
}

function loadManifest() {
  const path = resolve(ROOT, 'supabase/functions/edge-shared.manifest.json');
  if (!existsSync(path)) die(`Manifest not found: ${path}`);
  try {
    return parseManifest(readFileSync(path, 'utf8'));
  } catch (e) {
    die(`Failed to parse manifest: ${e.message}`);
  }
}

// ── Topological sort ──────────────────────────────────────────────────────────

export function topoSort(ports) {
  const byId = new Map(ports.map(p => [p.id, p]));
  const visited = new Set();
  const visiting = new Set();
  const order = [];

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      // Trace cycle
      const cycle = [...visiting, id];
      throw new Error(`Cycle detected in dependsOn: ${cycle.join(' → ')}`);
    }
    visiting.add(id);
    const port = byId.get(id);
    if (!port) throw new Error(`Unknown port id in dependsOn: "${id}"`);
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
  if (!existsSync(tsupBin))
    die('tsup not found in node_modules/.bin/tsup — run npm install');

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

/** Pure helper: returns npmNames that have no entry in the import map. */
export function validateImportMapEntries(ports, imports) {
  const missing = [];
  for (const port of ports) {
    if (!imports[port.npmName]) missing.push(port.npmName);
  }
  return missing;
}

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
      './' +
      port.outDir.replace(/^supabase\/functions\//, '') +
      '/' +
      entryBase;

    const mappedPath = imports[port.npmName];
    if (!mappedPath) {
      console.error(
        `[sync-edge-shared] ERROR: ${port.npmName} has no entry in deno.json imports`
      );
      errors++;
      continue;
    }

    if (mappedPath !== expectedRelPath) {
      console.error(
        `[sync-edge-shared] ERROR: import map entry for ${port.npmName} points to ${mappedPath}, expected ${expectedRelPath}`
      );
      errors++;
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

  if (errors > 0)
    die(`${errors} import map validation error(s) — check output above`);
  log('Import map validated OK');
}

// ── Bare import validation ────────────────────────────────────────────────────

const IMPORT_FROM_REGEX = /\bfrom\s+(['"])([^'"]+)\1/g;

/** Returns true when a module specifier is allowed in generated edge bundles. */
export function isAllowedImportSpecifier(specifier) {
  return (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('@beakerstack/') ||
    specifier.startsWith('npm:') ||
    specifier.startsWith('jsr:') ||
    specifier.startsWith('http://') ||
    specifier.startsWith('https://')
  );
}

/** Pure helper: returns bare npm specifiers left unresolved in generated JS. */
export function findBareImports(fileContent) {
  const violations = [];
  let match;
  IMPORT_FROM_REGEX.lastIndex = 0;
  while ((match = IMPORT_FROM_REGEX.exec(fileContent)) !== null) {
    const specifier = match[2];
    if (!isAllowedImportSpecifier(specifier)) {
      violations.push(specifier);
    }
  }
  return violations;
}

function walkJsFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkJsFiles(full));
    } else if (entry.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

function validateGeneratedBareImports() {
  const generatedDir = resolve(ROOT, 'supabase/functions/_shared/_generated');
  const jsFiles = walkJsFiles(generatedDir);
  let errors = 0;

  for (const filePath of jsFiles) {
    const content = readFileSync(filePath, 'utf8');
    const bareImports = findBareImports(content);
    for (const specifier of bareImports) {
      console.error(
        `[sync-edge-shared] ERROR: bare import "${specifier}" in ${filePath.replace(ROOT + '/', '')} — bundle via tsup noExternal or add npm: specifier`
      );
      errors++;
    }
  }

  if (errors > 0) {
    die(
      `${errors} bare import error(s) in generated edge bundles — check output above`
    );
  }
  log('Generated bundle imports validated OK');
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (__filename === process.argv[1]) {
  const manifest = loadManifest();
  const { ports } = manifest;

  if (!Array.isArray(ports) || ports.length === 0) {
    die('Manifest has no ports');
  }

  let ordered;
  try {
    ordered = topoSort(ports);
  } catch (e) {
    die(e.message);
  }

  log(`Building ${ordered.length} port(s) in dependency order…`);

  for (const port of ordered) {
    buildPort(port);
  }

  validateImportMap(ports);
  validateGeneratedBareImports();

  log(`Done. ${ordered.length} port(s) built successfully.`);
}

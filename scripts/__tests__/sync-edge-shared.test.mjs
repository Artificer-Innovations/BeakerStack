import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Inline copies of sync-edge-shared.mjs logic for unit testing ──────────────

function topoSort(ports) {
  const byId = new Map(ports.map(p => [p.id, p]));
  const visited = new Set();
  const visiting = new Set();
  const order = [];

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const cycle = [...visiting, id];
      throw new Error(`Cycle detected: ${cycle.join(' → ')}`);
    }
    visiting.add(id);
    const port = byId.get(id);
    if (!port) throw new Error(`Unknown port id: "${id}"`);
    for (const dep of port.dependsOn ?? []) visit(dep);
    visiting.delete(id);
    visited.add(id);
    order.push(port);
  }

  for (const port of ports) visit(port.id);
  return order;
}

function parseManifest(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data.ports)) throw new Error('manifest.ports must be an array');
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

function validateImportMapEntries(ports, imports) {
  const missing = [];
  for (const port of ports) {
    if (!imports[port.npmName]) missing.push(port.npmName);
  }
  return missing;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('manifest parsing', () => {
  it('parses a valid manifest', () => {
    const manifest = parseManifest(JSON.stringify({
      ports: [
        { id: 'a', package: 'packages/a', entry: 'src/index.ts',
          tsupConfig: 'tsup.config.ts', outDir: 'supabase/functions/_shared/_generated/a',
          npmName: '@scope/a', dependsOn: [] },
      ],
    }));
    assert.equal(manifest.ports.length, 1);
  });

  it('throws on missing ports array', () => {
    assert.throws(() => parseManifest(JSON.stringify({})), /ports must be an array/);
  });

  it('throws on port missing id', () => {
    assert.throws(
      () => parseManifest(JSON.stringify({ ports: [{ package: 'x', entry: 'y', tsupConfig: 'z', outDir: 'o', npmName: 'n' }] })),
      /missing required field "id"/
    );
  });
});

describe('topological sort', () => {
  it('returns single port unchanged', () => {
    const ports = [{ id: 'a', dependsOn: [] }];
    const result = topoSort(ports);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'a');
  });

  it('places dependency before dependent', () => {
    const ports = [
      { id: 'b', dependsOn: ['a'] },
      { id: 'a', dependsOn: [] },
    ];
    const result = topoSort(ports);
    const aIdx = result.findIndex(p => p.id === 'a');
    const bIdx = result.findIndex(p => p.id === 'b');
    assert.ok(aIdx < bIdx, 'a must come before b');
  });

  it('handles diamond dependency', () => {
    const ports = [
      { id: 'root', dependsOn: [] },
      { id: 'left', dependsOn: ['root'] },
      { id: 'right', dependsOn: ['root'] },
      { id: 'tip', dependsOn: ['left', 'right'] },
    ];
    const result = topoSort(ports);
    const rootIdx = result.findIndex(p => p.id === 'root');
    const tipIdx = result.findIndex(p => p.id === 'tip');
    assert.ok(rootIdx < tipIdx);
  });

  it('detects a cycle', () => {
    const ports = [
      { id: 'a', dependsOn: ['b'] },
      { id: 'b', dependsOn: ['a'] },
    ];
    assert.throws(() => topoSort(ports), /Cycle detected/);
  });

  it('throws on unknown dependency', () => {
    const ports = [{ id: 'a', dependsOn: ['nonexistent'] }];
    assert.throws(() => topoSort(ports), /Unknown port id/);
  });
});

describe('import map validation', () => {
  it('returns empty array when all ports are mapped', () => {
    const ports = [{ npmName: '@scope/a' }, { npmName: '@scope/b' }];
    const imports = { '@scope/a': './a.js', '@scope/b': './b.js' };
    const missing = validateImportMapEntries(ports, imports);
    assert.deepEqual(missing, []);
  });

  it('returns missing entries', () => {
    const ports = [{ npmName: '@scope/a' }, { npmName: '@scope/missing' }];
    const imports = { '@scope/a': './a.js' };
    const missing = validateImportMapEntries(ports, imports);
    assert.deepEqual(missing, ['@scope/missing']);
  });
});

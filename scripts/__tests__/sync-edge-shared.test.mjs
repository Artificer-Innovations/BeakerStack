import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { topoSort, parseManifest, validateImportMapEntries } from '../sync-edge-shared.mjs';

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

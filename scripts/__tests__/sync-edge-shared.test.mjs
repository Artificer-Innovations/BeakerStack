import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  topoSort,
  parseManifest,
  validateImportMapEntries,
  findBareImports,
  extractImportSpecifiers,
  isAllowedImportSpecifier,
} from '../sync-edge-shared.mjs';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('manifest parsing', () => {
  it('parses a valid manifest', () => {
    const manifest = parseManifest(
      JSON.stringify({
        ports: [
          {
            id: 'a',
            package: 'packages/a',
            entry: 'src/index.ts',
            tsupConfig: 'tsup.config.ts',
            outDir: 'supabase/functions/_shared/_generated/a',
            npmName: '@scope/a',
            dependsOn: [],
          },
        ],
      })
    );
    assert.equal(manifest.ports.length, 1);
  });

  it('throws on missing ports array', () => {
    assert.throws(
      () => parseManifest(JSON.stringify({})),
      /ports must be an array/
    );
  });

  it('throws on port missing id', () => {
    assert.throws(
      () =>
        parseManifest(
          JSON.stringify({
            ports: [
              {
                package: 'x',
                entry: 'y',
                tsupConfig: 'z',
                outDir: 'o',
                npmName: 'n',
              },
            ],
          })
        ),
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

describe('bare import detection', () => {
  it('allows workspace, relative, and npm specifiers', () => {
    assert.equal(isAllowedImportSpecifier('./schema.js'), true);
    assert.equal(isAllowedImportSpecifier('../logger/index.js'), true);
    assert.equal(isAllowedImportSpecifier('@beakerstack/logger'), true);
    assert.equal(isAllowedImportSpecifier('npm:zod@3.22.0'), true);
    assert.equal(isAllowedImportSpecifier('jsr:@std/path'), true);
    assert.equal(isAllowedImportSpecifier('https://example.com/mod.js'), true);
  });

  it('returns no violations for clean generated-style imports', () => {
    const content = `
      import { setupLogging } from "@beakerstack/logger";
      import { validateConfig } from "./schema.js";
      export { foo } from "../utils.js";
    `;
    assert.deepEqual(findBareImports(content), []);
  });

  it('flags bare npm specifiers', () => {
    const content = `import { z } from "zod";`;
    assert.deepEqual(findBareImports(content), ['zod']);
  });

  it('allows npm-prefixed specifiers', () => {
    const content = `import { z } from "npm:zod@3.22.0";`;
    assert.deepEqual(findBareImports(content), []);
  });

  it('flags side-effect bare npm imports', () => {
    const content = `import "zod";`;
    assert.deepEqual(findBareImports(content), ['zod']);
  });

  it('flags dynamic bare npm imports', () => {
    const content = `const mod = await import("zod");`;
    assert.deepEqual(findBareImports(content), ['zod']);
  });

  it('allows side-effect and dynamic npm-prefixed specifiers', () => {
    const content = `
      import "npm:zod@3.22.0";
      const mod = await import('npm:zod@3.22.0');
    `;
    assert.deepEqual(findBareImports(content), []);
  });

  it('extracts specifiers from all supported import forms', () => {
    const content = `
      import { z } from "zod";
      import "side-effect";
      export { foo } from "./local.js";
      const mod = import("dynamic");
    `;
    assert.deepEqual(extractImportSpecifiers(content), [
      'zod',
      './local.js',
      'side-effect',
      'dynamic',
    ]);
  });
});

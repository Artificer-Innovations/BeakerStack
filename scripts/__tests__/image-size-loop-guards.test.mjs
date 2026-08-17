import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import path from 'node:path';

const require = createRequire(import.meta.url);
const imageSize = require('../../vendor/image-size');

const vendorDir = fileURLToPath(
  new URL('../../vendor/image-size/', import.meta.url)
);
const vendorEntry = path.join(vendorDir, 'dist/index.js');
const icnsSrc = readFileSync(
  path.join(vendorDir, 'dist/types/icns.js'),
  'utf8'
);
const utilsSrc = readFileSync(
  path.join(vendorDir, 'dist/types/utils.js'),
  'utf8'
);

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

// node:test `{ timeout }` does not interrupt a synchronous infinite loop. Run
// the parser in a worker so a hang fails this test instead of wedging the runner.
function parseWithDeadline(payload, label, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(
      `
      const { parentPort, workerData } = require('node:worker_threads');
      const imageSize = require(${JSON.stringify(vendorEntry)});
      try {
        imageSize(Buffer.from(workerData.bytes));
        parentPort.postMessage({ ok: true });
      } catch (err) {
        parentPort.postMessage({
          ok: true,
          error: String(err && err.message ? err.message : err),
        });
      }
      `,
      { eval: true, workerData: { bytes: Buffer.from(payload) } }
    );
    const timer = setTimeout(() => {
      finish(() => {
        worker.terminate().finally(() => {
          reject(
            new Error(
              `${label}: timed out after ${timeoutMs}ms (possible hang)`
            )
          );
        });
      });
    }, timeoutMs);
    function finish(fn) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    }
    worker.once('message', msg => finish(() => resolve(msg)));
    worker.once('error', err => finish(() => reject(err)));
  });
}

function assertDoesNotHang(label, payload) {
  test(label, async () => {
    const result = await parseWithDeadline(payload, label);
    assert.equal(result.ok, true);
  });
}

test('vendored image-size still reads a valid PNG', () => {
  const size = imageSize(PNG_1X1);
  assert.equal(size.width, 1);
  assert.equal(size.height, 1);
  assert.equal(size.type, 'png');
});

test('require("image-size") is the in-repo vendor copy', () => {
  const pkg = require('image-size/package.json');
  assert.equal(pkg.name, '@beakerstack/image-size');
});

test('ICNS and findBox loop guards are still present', () => {
  assert.match(icnsSrc, /const MIN_ENTRY_LENGTH = 8/);
  assert.match(icnsSrc, /if \(entryLength < MIN_ENTRY_LENGTH\)/);
  assert.match(icnsSrc, /if \(nextOffset <= imageOffset\)/);
  assert.match(utilsSrc, /const MIN_BOX_HEADER = 8/);
  assert.match(utilsSrc, /if \(boxSize < MIN_BOX_HEADER\)/);
  assert.match(utilsSrc, /if \(nextOffset <= offset\)/);
});

// GHSA-5p2g-fcmc-qvqq — zero-size ISO BMFF boxes (JXL / HEIF)
assertDoesNotHang(
  'JXL payload with zero-size box does not hang',
  new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x4a, 0x58, 0x4c, 0x20])
);

assertDoesNotHang(
  'HEIF payload with zero-size box does not hang',
  new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
  ])
);

// GHSA-w3rx-r6r6-pgpr — ICNS entry length 0
assertDoesNotHang(
  'ICNS payload with zero entry length does not hang',
  new Uint8Array([
    0x69, 0x63, 0x6e, 0x73, 0x00, 0x00, 0x00, 0x18, 0x49, 0x43, 0x4f, 0x4e,
    0x00, 0x00, 0x00, 0x00,
  ])
);

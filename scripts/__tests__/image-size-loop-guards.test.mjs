import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const imageSize = require('../../vendor/image-size');

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function assertDoesNotHang(label, payload) {
  test(label, { timeout: 1000 }, () => {
    try {
      imageSize(payload);
    } catch (err) {
      assert.ok(err instanceof Error, `${label}: expected Error, got ${err}`);
    }
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

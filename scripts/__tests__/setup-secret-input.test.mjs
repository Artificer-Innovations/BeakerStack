import assert from 'node:assert/strict';
import test from 'node:test';
import { PassThrough } from 'node:stream';

import { readMaskedLineIfTty } from '../lib/setup-secret-input.mjs';

/** @param {Record<string, unknown>} [extra] */
function mockTty(extra = {}) {
  const pt = new PassThrough();
  Object.assign(pt, {
    isTTY: true,
    isRawMode: false,
    /** @param {boolean} flag */
    setRawMode(flag) {
      pt.isRawMode = Boolean(flag);
    },
    ...extra,
  });
  return /** @type {import('stream').PassThrough & { isTTY: boolean; isRawMode: boolean; setRawMode: (b: boolean) => void }} */ (
    pt
  );
}

const noopRl = {
  pause() {},
  resume() {},
};

test('readMaskedLineIfTty returns null when __testRawSource is not a TTY', async () => {
  const raw = mockTty({ isTTY: false });
  const out = { write() {} };
  const r = await readMaskedLineIfTty(noopRl, new PassThrough(), out, 'x', { __testRawSource: raw });
  assert.equal(r, null);
});

test('readMaskedLineIfTty returns null when setRawMode throws', async () => {
  const raw = mockTty({
    setRawMode() {
      throw new Error('ENOTTY');
    },
  });
  const out = { write() {} };
  const r = await readMaskedLineIfTty(noopRl, new PassThrough(), out, 'x', { __testRawSource: raw });
  assert.equal(r, null);
});

test('readMaskedLineIfTty resolves empty string on LF alone', async () => {
  const raw = mockTty();
  const out = { write() {} };
  const p = readMaskedLineIfTty(noopRl, new PassThrough(), out, 'p', { __testRawSource: raw });
  queueMicrotask(() => {
    raw.push('\n');
  });
  assert.equal(await p, '');
});

test('readMaskedLineIfTty resolves accumulated chars before CRLF', async () => {
  const raw = mockTty();
  const out = { write() {} };
  const p = readMaskedLineIfTty(noopRl, new PassThrough(), out, 'p', { __testRawSource: raw });
  queueMicrotask(() => {
    raw.push('hi\r\n');
  });
  assert.equal(await p, 'hi');
});

test('readMaskedLineIfTty handles backspace (127)', async () => {
  const raw = mockTty();
  const out = { write() {} };
  const p = readMaskedLineIfTty(noopRl, new PassThrough(), out, 'p', { __testRawSource: raw });
  queueMicrotask(() => {
    raw.push('ab');
    raw.push(Buffer.from([127]));
    raw.push('c\n');
  });
  assert.equal(await p, 'ac');
});

test('readMaskedLineIfTty EOT (4) submits without Enter', async () => {
  const raw = mockTty();
  const out = { write() {} };
  const p = readMaskedLineIfTty(noopRl, new PassThrough(), out, 'p', { __testRawSource: raw });
  queueMicrotask(() => {
    raw.push('x');
    raw.push(Buffer.from([4]));
  });
  assert.equal(await p, 'x');
});

test('readMaskedLineIfTty uses maskChar in opts', async () => {
  const raw = mockTty();
  /** @type {string[]} */
  const chunks = [];
  const out = {
    /** @param {string} s */
    write(s) {
      chunks.push(String(s));
    },
  };
  const p = readMaskedLineIfTty(noopRl, new PassThrough(), out, 'p', {
    __testRawSource: raw,
    maskChar: '#',
  });
  queueMicrotask(() => {
    raw.push('a\n');
  });
  assert.equal(await p, 'a');
  assert.ok(chunks.some((c) => c.includes('#')));
});

import { describe, it, expect, jest } from '@jest/globals';

jest.mock('react-native-get-random-values', () => {});

const { randomUuid } =
  require('../randomUuid') as typeof import('../randomUuid');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomUuid', () => {
  it('returns a valid v4 UUID via crypto.randomUUID (path 1)', () => {
    expect(randomUuid()).toMatch(UUID_RE);
  });

  it('returns a valid v4 UUID via getRandomValues when randomUUID is absent (path 2)', () => {
    const savedCrypto = globalThis.crypto;
    const getRandomValues = jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i += 1) {
        arr[i] = (i * 17) % 256;
      }
      return arr;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).crypto = { getRandomValues };
    try {
      const id = randomUuid();
      expect(getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(id).toMatch(UUID_RE);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).crypto = savedCrypto;
    }
  });

  it('returns a valid v4 UUID via Math.random when crypto is absent (path 3)', () => {
    const savedCrypto = globalThis.crypto;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).crypto = undefined;
    try {
      expect(randomUuid()).toMatch(UUID_RE);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).crypto = savedCrypto;
    }
  });
});

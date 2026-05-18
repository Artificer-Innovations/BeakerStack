import { describe, it, expect, jest } from '@jest/globals';

jest.mock('react-native-get-random-values', () => {});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { randomUuid } = require('../randomUuid') as typeof import('../randomUuid');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomUuid', () => {
  it('returns a valid v4 UUID via crypto.randomUUID (path 1)', () => {
    expect(randomUuid()).toMatch(UUID_RE);
  });

  it('returns a valid v4 UUID via getRandomValues when randomUUID is absent (path 2)', () => {
    const saved = globalThis.crypto?.randomUUID;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis.crypto as any).randomUUID;
    expect(randomUuid()).toMatch(UUID_RE);
    if (saved) (globalThis.crypto as unknown as Record<string, unknown>).randomUUID = saved;
  });

  it('returns a valid v4 UUID via Math.random when crypto is absent (path 3)', () => {
    const savedCrypto = globalThis.crypto;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).crypto = undefined;
    expect(randomUuid()).toMatch(UUID_RE);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).crypto = savedCrypto;
  });
});

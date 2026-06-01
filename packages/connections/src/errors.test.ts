import { describe, expect, it } from 'vitest';
import { connectionsError, mapUnknownError } from './errors.js';

describe('connectionsError', () => {
  it('builds a structured error', () => {
    const err = connectionsError('validation', 'bad', new Error('x'));
    expect(err).toEqual({
      kind: 'validation',
      message: 'bad',
      cause: expect.any(Error),
    });
  });
});

describe('mapUnknownError', () => {
  it('maps jwt and auth messages to unauthenticated', () => {
    expect(mapUnknownError(new Error('JWT expired')).kind).toBe(
      'unauthenticated'
    );
    expect(mapUnknownError(new Error('auth session missing')).kind).toBe(
      'unauthenticated'
    );
    expect(mapUnknownError('not authenticated').kind).toBe('unauthenticated');
  });

  it('maps rate limit messages', () => {
    expect(mapUnknownError(new Error('Rate limit exceeded')).kind).toBe(
      'rate_limit'
    );
  });

  it('maps hidden-profile request rejection to validation', () => {
    expect(
      mapUnknownError(new Error('user does not accept connection requests'))
        .kind
    ).toBe('validation');
  });

  it('maps network and fetch messages', () => {
    expect(mapUnknownError(new Error('fetch failed')).kind).toBe('network');
    expect(mapUnknownError(new Error('Network error')).kind).toBe('network');
  });

  it('maps unknown errors from Error, string, and other values', () => {
    expect(mapUnknownError(new Error('boom')).kind).toBe('unknown');
    expect(mapUnknownError('plain').message).toBe('plain');
    expect(mapUnknownError({ code: 1 }).message).toBe('Unknown error');
  });

  it('falls back when message is not a string', () => {
    expect(mapUnknownError({ message: 42 }).message).toBe('Unknown error');
    expect(mapUnknownError(null).message).toBe('Unknown error');
  });

  it('reads message from Supabase-style error objects', () => {
    expect(mapUnknownError({ message: 'JWT invalid' }).kind).toBe(
      'unauthenticated'
    );
    expect(mapUnknownError({ message: 'rate limit exceeded' }).kind).toBe(
      'rate_limit'
    );
  });
});

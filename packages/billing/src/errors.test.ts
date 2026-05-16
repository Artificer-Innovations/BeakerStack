import { describe, expect, it } from 'vitest';
import { billingError, mapUnknownError } from './errors.js';

describe('billingError', () => {
  it('includes optional cause', () => {
    const inner = new Error('root');
    const e = billingError('validation', 'bad input', inner);
    expect(e.kind).toBe('validation');
    expect(e.message).toBe('bad input');
    expect(e.cause).toBe(inner);
  });
});

describe('mapUnknownError', () => {
  it('maps jwt-like messages to unauthenticated', () => {
    const e = mapUnknownError(new Error('JWT expired'));
    expect(e.kind).toBe('unauthenticated');
  });

  it('maps auth keyword in message', () => {
    expect(mapUnknownError(new Error('Not authenticated')).kind).toBe(
      'unauthenticated'
    );
  });

  it('maps literal unauthenticated message', () => {
    expect(mapUnknownError(new Error('unauthenticated')).kind).toBe(
      'unauthenticated'
    );
  });

  it('maps fetch / network messages', () => {
    expect(mapUnknownError(new Error('Failed to fetch')).kind).toBe('network');
    expect(mapUnknownError(new Error('Network error')).kind).toBe('network');
  });

  it('maps non-Error values to unknown', () => {
    const e = mapUnknownError('timeout');
    expect(e.kind).toBe('unknown');
    expect(e.message).toBe('timeout');
  });

  it('extracts message from PostgREST-style error objects', () => {
    const e = mapUnknownError({
      code: 'P0001',
      message: 'Usage limit exceeded for this meter',
      details: null,
      hint: null,
    });
    expect(e.kind).toBe('unknown');
    expect(e.message).toBe('Usage limit exceeded for this meter');
  });

  it('falls back to code and details when message is missing', () => {
    const e = mapUnknownError({
      code: '42883',
      details: 'function does not exist',
    });
    expect(e.message).toContain('42883');
    expect(e.message).toContain('function does not exist');
  });

  it('passes through BillingError', () => {
    const inner = billingError('stripe', 'bad');
    const e = mapUnknownError(inner);
    expect(e).toEqual(inner);
  });
});

import { describe, it, expect } from 'vitest';
import { parseBillingFunctionError } from './parseBillingFunctionError.js';

describe('parseBillingFunctionError (coverage)', () => {
  it('returns error string only when hint is absent', () => {
    const err = parseBillingFunctionError({ error: 'card declined' }, undefined);
    expect(err.kind).toBe('stripe');
    expect(err.message).toBe('card declined');
  });

  it('returns generic fallback when data is null and fnErr is undefined', () => {
    const err = parseBillingFunctionError(null, undefined);
    expect(err.kind).toBe('stripe');
    expect(err.message).toBe('Billing request failed');
  });
});

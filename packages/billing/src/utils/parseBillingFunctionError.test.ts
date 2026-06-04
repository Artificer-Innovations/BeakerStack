import { describe, expect, it } from 'vitest';
import { parseBillingFunctionError } from './parseBillingFunctionError.js';

describe('parseBillingFunctionError', () => {
  it('uses error and hint from function JSON body', () => {
    const err = parseBillingFunctionError(
      {
        error: 'invalid_redirect_url',
        hint: 'Add origin to BILLING_ALLOWED_ORIGINS',
      },
      new Error('FunctionsHttpError')
    );
    expect(err.kind).toBe('stripe');
    expect(err.message).toContain('invalid_redirect_url');
    expect(err.message).toContain('BILLING_ALLOWED_ORIGINS');
  });

  it('falls back to invoke error when body has no error field', () => {
    const err = parseBillingFunctionError(null, new Error('network down'));
    expect(err.message).toContain('network down');
  });

  it('returns error string only when hint is absent', () => {
    const err = parseBillingFunctionError(
      { error: 'card declined' },
      undefined
    );
    expect(err.kind).toBe('stripe');
    expect(err.message).toBe('card declined');
  });

  it('returns generic fallback when data is null and fnErr is undefined', () => {
    const err = parseBillingFunctionError(null, undefined);
    expect(err.kind).toBe('stripe');
    expect(err.message).toBe('Billing request failed');
  });

  it('ignores whitespace-only error strings in the body', () => {
    const err = parseBillingFunctionError(
      { error: '   ' },
      new Error('invoke')
    );
    expect(err.message).toContain('invoke');
  });
});

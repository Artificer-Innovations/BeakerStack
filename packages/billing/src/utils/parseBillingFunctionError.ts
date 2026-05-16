import { billingError, mapUnknownError } from '../errors.js';
import type { BillingError } from '../errors.js';

/** Body shape returned by `billing-stripe` on 4xx responses. */
type BillingStripeErrorBody = {
  error?: string;
  hint?: string;
};

/**
 * Prefer structured Edge Function JSON (`error` / `hint`) over generic invoke errors.
 */
export function parseBillingFunctionError(
  data: unknown,
  fnErr: unknown
): BillingError {
  if (data && typeof data === 'object') {
    const body = data as BillingStripeErrorBody;
    if (typeof body.error === 'string' && body.error.trim()) {
      const hint =
        typeof body.hint === 'string' && body.hint.trim()
          ? body.hint.trim()
          : undefined;
      return billingError(
        'stripe',
        hint ? `${body.error}: ${hint}` : body.error,
        fnErr ?? body
      );
    }
  }
  if (fnErr) return mapUnknownError(fnErr);
  return billingError('stripe', 'Billing request failed');
}

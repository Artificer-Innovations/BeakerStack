export type BillingErrorKind =
  | 'unauthenticated'
  | 'network'
  | 'stripe'
  | 'validation'
  | 'rate_limit'
  | 'unknown';

export type BillingError = {
  kind: BillingErrorKind;
  message: string;
  cause?: unknown;
};

export function billingError(
  kind: BillingErrorKind,
  message: string,
  cause?: unknown
): BillingError {
  return { kind, message, cause };
}

export function mapUnknownError(err: unknown): BillingError {
  if (
    err &&
    typeof err === 'object' &&
    'kind' in err &&
    typeof (err as BillingError).kind === 'string'
  ) {
    return err as BillingError;
  }
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('jwt') ||
    lower.includes('auth') ||
    lower.includes('unauthenticated')
  ) {
    return billingError('unauthenticated', msg, err);
  }
  if (
    msg.toLowerCase().includes('fetch') ||
    msg.toLowerCase().includes('network')
  ) {
    return billingError('network', msg, err);
  }
  return billingError('unknown', msg, err);
}

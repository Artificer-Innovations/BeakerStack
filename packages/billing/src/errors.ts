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

function messageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o['message'] === 'string' && o['message'].trim())
      return o['message'];
    if (
      typeof o['error_description'] === 'string' &&
      o['error_description'].trim()
    ) {
      return o['error_description'];
    }
    if (typeof o['msg'] === 'string' && o['msg'].trim()) return o['msg'];
    if (typeof o['code'] === 'string') {
      const parts = [o['code']];
      if (typeof o['details'] === 'string' && o['details'].trim())
        parts.push(o['details']);
      if (typeof o['hint'] === 'string' && o['hint'].trim())
        parts.push(o['hint']);
      return parts.join(' · ');
    }
  }
  if (typeof err === 'string') return err;
  if (typeof err === 'bigint') return err.toString();
  try {
    const j = JSON.stringify(err);
    if (typeof j === 'string') return j;
  } catch {
    /* e.g. cyclic structure, or stringify rejects the value */
  }
  try {
    return String(err);
  } catch {
    return 'Unknown error';
  }
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
  const msg = messageFromUnknown(err);
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

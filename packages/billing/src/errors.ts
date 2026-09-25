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

function nonEmptyString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function messageFromObject(o: Record<string, unknown>): string | null {
  return (
    nonEmptyString(o['message']) ??
    nonEmptyString(o['error_description']) ??
    nonEmptyString(o['msg']) ??
    messageFromCode(o)
  );
}

function messageFromCode(o: Record<string, unknown>): string | null {
  if (typeof o['code'] !== 'string') return null;
  const parts = [o['code']];
  const details = nonEmptyString(o['details']);
  if (details) parts.push(details);
  const hint = nonEmptyString(o['hint']);
  if (hint) parts.push(hint);
  return parts.join(' · ');
}

function messageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const fromObject = messageFromObject(err as Record<string, unknown>);
    if (fromObject != null) return fromObject;
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

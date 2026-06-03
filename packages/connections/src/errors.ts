export type ConnectionsErrorKind =
  | 'unauthenticated'
  | 'network'
  | 'validation'
  | 'rate_limit'
  | 'unknown';

export type ConnectionsError = {
  kind: ConnectionsErrorKind;
  message: string;
  cause?: unknown;
};

export function connectionsError(
  kind: ConnectionsErrorKind,
  message: string,
  cause?: unknown
): ConnectionsError {
  return { kind, message, cause };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  return 'Unknown error';
}

export function mapUnknownError(err: unknown): ConnectionsError {
  const msg = errorMessage(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('jwt') ||
    lower.includes('auth') ||
    lower.includes('not authenticated')
  ) {
    return connectionsError('unauthenticated', msg, err);
  }
  if (lower.includes('rate limit')) {
    return connectionsError('rate_limit', msg, err);
  }
  if (lower.includes('does not accept connection requests')) {
    return connectionsError('validation', msg, err);
  }
  if (lower.includes('fetch') || lower.includes('network')) {
    return connectionsError('network', msg, err);
  }
  return connectionsError('unknown', msg, err);
}

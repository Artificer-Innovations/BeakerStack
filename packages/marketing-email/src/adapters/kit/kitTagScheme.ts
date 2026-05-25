export interface TagSchemeOpts {
  separator?: string;
  tierPrefix?: string;
}

const DEFAULT_SEP = ':';
const DEFAULT_TIER_PREFIX = 'tier';

export function waitlistTag(namespace: string, opts?: TagSchemeOpts): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  return `${namespace}${sep}waitlist`;
}

export function waitlistApprovedTag(
  namespace: string,
  opts?: TagSchemeOpts
): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  return `${namespace}${sep}waitlist-approved`;
}

export function convertedTag(namespace: string, opts?: TagSchemeOpts): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  return `${namespace}${sep}converted`;
}

export function signupTag(namespace: string, opts?: TagSchemeOpts): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  return `${namespace}${sep}signup`;
}

export function tierTag(
  namespace: string,
  tier: string,
  opts?: TagSchemeOpts
): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  const prefix = opts?.tierPrefix ?? DEFAULT_TIER_PREFIX;
  return `${namespace}${sep}${prefix}${sep}${tier}`;
}

export function churnedTag(namespace: string, opts?: TagSchemeOpts): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  return `${namespace}${sep}churned`;
}

export function interestTag(
  namespace: string,
  tier: string,
  opts?: TagSchemeOpts
): string {
  const sep = opts?.separator ?? DEFAULT_SEP;
  return `${namespace}${sep}interest${sep}${tier}`;
}

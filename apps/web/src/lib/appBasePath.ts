/** Origin + router basename (no trailing slash), for BillingProvider checkout URLs. */
export function appBasePath(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}`;
}

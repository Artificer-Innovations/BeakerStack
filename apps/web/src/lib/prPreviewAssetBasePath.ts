/**
 * Prefix for root-relative static assets when the SPA is served from a PR-preview
 * URL (`/pr-<number>/...`). Matches pathname segments used with `vite.base` / preview deploys.
 */
export function getPrPreviewAssetBasePath(): string {
  if (typeof window === 'undefined') return '/';
  const match = window.location.pathname.match(/^(\/pr-\d+)/);
  return match ? `${match[1]}/` : '/';
}

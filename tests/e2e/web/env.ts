import path from 'node:path';

/** Resolved Playwright base URL (origin + optional PR preview base path). */
export function getWebBaseUrl(): string {
  const origin = (process.env.WEB_URL || 'http://localhost:5173').replace(
    /\/$/,
    ''
  );
  const basePath = normalizeBasePath(process.env.WEB_BASE_PATH);
  if (!basePath || basePath === '/') {
    return `${origin}/`;
  }
  return `${origin}${basePath}/`;
}

/** Router-relative path joined to {@link getWebBaseUrl}. */
export function webPath(routePath: string): string {
  const base = getWebBaseUrl();
  const segment = routePath.startsWith('/') ? routePath.slice(1) : routePath;
  return segment ? `${base}${segment}` : base;
}

export function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') {
    return '/';
  }
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.replace(/\/$/, '') || '/';
}

/** Marketing landing route, including PR preview base paths (/pr-N with optional trailing slash). */
export function isLandingPathname(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const basePath = normalizeBasePath(process.env.WEB_BASE_PATH);
  if (basePath === '/') {
    return normalized === '/';
  }
  return normalized === basePath;
}

/** Map preview CI secrets onto integration test env names. */
export function applyE2eSupabaseEnv(): void {
  if (process.env.PREVIEW_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.PREVIEW_SUPABASE_URL;
  }
  if (process.env.PREVIEW_SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = process.env.PREVIEW_SUPABASE_ANON_KEY;
  }
  if (process.env.PR_TESTING_SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.PR_TESTING_SUPABASE_SERVICE_ROLE_KEY;
  }
}

export const e2eAuthDir = path.join(__dirname, '.auth');
export const e2eStatePath = path.join(e2eAuthDir, 'state.json');
export const e2eAdminStatePath = path.join(e2eAuthDir, 'admin-state.json');
export const e2eStorageStatePath = path.join(e2eAuthDir, 'user.json');
export const e2eAdminStorageStatePath = path.join(e2eAuthDir, 'admin.json');

export interface E2eSeedState {
  email: string;
  password: string;
  userId: string;
}

export function isPreviewTarget(): boolean {
  return process.env.E2E_TARGET === 'preview';
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLikelyAuthenticated } from '../lib/authStorageHint';

describe('authStorageHint (coverage)', () => {
  const STORAGE_KEY = 'sb-localhost-auth-token';

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_AUTH_STORAGE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('returns false when access_token is a number (not a string)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ access_token: 42, refresh_token: 'r' }));
    expect(getLikelyAuthenticated()).toBe(false);
  });

  it('returns false when access_token is an empty string', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ access_token: '', refresh_token: 'r' }));
    expect(getLikelyAuthenticated()).toBe(false);
  });
});

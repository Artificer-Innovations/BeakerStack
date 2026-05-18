import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLikelyAuthenticated,
  getSupabaseAuthStorageKey,
} from '../lib/authStorageHint';

describe('authStorageHint', () => {
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

  it('getSupabaseAuthStorageKey mirrors supabase-js hostname convention', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abcd.supabase.co');
    expect(getSupabaseAuthStorageKey()).toBe('sb-abcd-auth-token');
  });

  it('getSupabaseAuthStorageKey respects VITE_SUPABASE_AUTH_STORAGE_KEY override', () => {
    vi.stubEnv('VITE_SUPABASE_AUTH_STORAGE_KEY', 'sb-custom-auth-token');
    expect(getSupabaseAuthStorageKey()).toBe('sb-custom-auth-token');
  });

  it('getLikelyAuthenticated is false when key missing', () => {
    expect(getLikelyAuthenticated()).toBe(false);
  });

  it('getLikelyAuthenticated is true when stored blob has access_token', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access_token: 'jwt-here', refresh_token: 'r' })
    );
    expect(getLikelyAuthenticated()).toBe(true);
  });

  it('getLikelyAuthenticated ignores legacy nested currentSession shape (not v2 storage)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentSession: { access_token: 'jwt', refresh_token: 'r' },
      })
    );
    expect(getLikelyAuthenticated()).toBe(false);
  });

  it('getLikelyAuthenticated is false for malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(getLikelyAuthenticated()).toBe(false);
  });

  it('getLikelyAuthenticated is false when token missing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: { id: 'x' } }));
    expect(getLikelyAuthenticated()).toBe(false);
  });

  it('getLikelyAuthenticated is false when VITE_SUPABASE_URL missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access_token: 'jwt-here', refresh_token: 'r' })
    );
    expect(getLikelyAuthenticated()).toBe(false);
  });

  it('getLikelyAuthenticated is false when access_token is a number (not a string)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access_token: 42, refresh_token: 'r' })
    );
    expect(getLikelyAuthenticated()).toBe(false);
  });

  it('getLikelyAuthenticated is false when access_token is an empty string', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access_token: '', refresh_token: 'r' })
    );
    expect(getLikelyAuthenticated()).toBe(false);
  });
});

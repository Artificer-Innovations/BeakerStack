import { describe, expect, it, afterEach, vi } from 'vitest';

describe('supabase module env guards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    await expect(import('../supabase')).rejects.toThrow(
      /Missing VITE_SUPABASE_URL/
    );
  });

  it('throws when VITE_SUPABASE_ANON_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    await expect(import('../supabase')).rejects.toThrow(
      /Missing VITE_SUPABASE_ANON_KEY/
    );
  });
});

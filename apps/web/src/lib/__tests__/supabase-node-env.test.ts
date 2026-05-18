import { describe, it, expect, vi, afterEach } from 'vitest';

describe('supabase.ts — node env logs (coverage)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadSupabaseWithNodeEnv(env: Record<string, string>) {
    const warn = vi.fn();
    const debug = vi.fn();
    vi.doMock('@beakerstack/shared/utils/logger', () => ({
      Logger: { warn, debug, error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({})),
    }));
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    vi.stubGlobal('window', undefined);
    vi.resetModules();
    await import('../supabase');
    return { warn, debug };
  }

  it('warns when VITE_SUPABASE_URL is not set in node env', async () => {
    const { warn } = await loadSupabaseWithNodeEnv({
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: 'test-key',
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('VITE_SUPABASE_URL')
    );
  });

  it('warns when VITE_SUPABASE_ANON_KEY is not set in node env', async () => {
    const { warn } = await loadSupabaseWithNodeEnv({
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: '',
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('VITE_SUPABASE_ANON_KEY')
    );
  });

  it('logs ws:// realtime URL when supabase URL uses http in node env', async () => {
    const { debug } = await loadSupabaseWithNodeEnv({
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-key',
    });
    expect(debug).toHaveBeenCalledWith(
      expect.stringContaining('Realtime'),
      expect.stringContaining('ws://')
    );
  });
});

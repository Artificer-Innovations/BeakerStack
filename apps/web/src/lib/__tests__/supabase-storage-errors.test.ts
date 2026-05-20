import { describe, it, expect, vi, afterEach } from 'vitest';

describe('supabase storage error / SSR guards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadSupabaseWith(
    overrides: {
      sessionStorage?: Partial<Storage> | undefined;
      windowGlobal?: unknown;
      hashSearch?: { hash?: string; search?: string };
      env?: Record<string, string>;
    } = {}
  ) {
    vi.doMock('@beakerstack/shared/utils/logger', () => ({
      Logger: { warn: vi.fn(), debug: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({})),
    }));

    for (const [k, v] of Object.entries(
      overrides.env ?? {
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon',
      }
    )) {
      vi.stubEnv(k, v);
    }

    if ('windowGlobal' in overrides) {
      vi.stubGlobal('window', overrides.windowGlobal as Window);
    } else if (overrides.hashSearch) {
      vi.stubGlobal('window', {
        location: {
          hash: overrides.hashSearch.hash ?? '',
          search: overrides.hashSearch.search ?? '',
        },
      } as unknown as Window);
    }

    if ('sessionStorage' in overrides) {
      vi.stubGlobal('sessionStorage', overrides.sessionStorage as Storage);
    }

    vi.resetModules();
    return await import('../supabase');
  }

  it('isPasswordRecoveryCallback is false in node when window is undefined', async () => {
    const mod = await loadSupabaseWith({ windowGlobal: undefined });
    expect(mod.isPasswordRecoveryCallback).toBe(false);
  });

  it('hasPasswordRecoveryCallback returns false in node when window is undefined', async () => {
    const mod = await loadSupabaseWith({ windowGlobal: undefined });
    expect(mod.hasPasswordRecoveryCallback()).toBe(false);
  });

  it('clearPasswordRecoveryCallback is a no-op in node when window is undefined', async () => {
    const mod = await loadSupabaseWith({ windowGlobal: undefined });
    expect(() => mod.clearPasswordRecoveryCallback()).not.toThrow();
  });

  it('capturePasswordRecoveryCallback swallows sessionStorage.setItem errors', async () => {
    const setItem = vi.fn(() => {
      throw new Error('quota');
    });
    const mod = await loadSupabaseWith({
      hashSearch: { hash: '#type=recovery&access_token=tok' },
      sessionStorage: {
        getItem: vi.fn(() => null),
        setItem,
        removeItem: vi.fn(),
      } as unknown as Storage,
    });
    expect(setItem).toHaveBeenCalled();
    // capturePasswordRecoveryCallback still returns true (recovery URL detected)
    expect(mod.isPasswordRecoveryCallback).toBe(true);
  });

  it('hasPasswordRecoveryCallback returns false when sessionStorage.getItem throws', async () => {
    const mod = await loadSupabaseWith({
      sessionStorage: {
        getItem: vi.fn(() => {
          throw new Error('blocked');
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage,
    });
    expect(mod.hasPasswordRecoveryCallback()).toBe(false);
  });

  it('clearPasswordRecoveryCallback swallows sessionStorage.removeItem errors', async () => {
    const mod = await loadSupabaseWith({
      sessionStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(() => {
          throw new Error('blocked');
        }),
      } as unknown as Storage,
    });
    expect(() => mod.clearPasswordRecoveryCallback()).not.toThrow();
  });

  it('falls back to placeholder URL/anon-key when env vars are undefined in node', async () => {
    vi.doMock('@beakerstack/shared/utils/logger', () => ({
      Logger: { warn: vi.fn(), debug: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    const createClient = vi.fn(() => ({}));
    vi.doMock('@supabase/supabase-js', () => ({ createClient }));

    const env = import.meta.env as Record<string, unknown>;
    const originalUrl = env.VITE_SUPABASE_URL;
    const originalAnon = env.VITE_SUPABASE_ANON_KEY;
    delete env.VITE_SUPABASE_URL;
    delete env.VITE_SUPABASE_ANON_KEY;
    vi.stubGlobal('window', undefined);
    vi.resetModules();

    try {
      await import('../supabase');
      expect(createClient).toHaveBeenCalledWith(
        'https://placeholder.supabase.co',
        'placeholder-anon-key'
      );
    } finally {
      if (originalUrl !== undefined) env.VITE_SUPABASE_URL = originalUrl;
      if (originalAnon !== undefined) env.VITE_SUPABASE_ANON_KEY = originalAnon;
    }
  });
});

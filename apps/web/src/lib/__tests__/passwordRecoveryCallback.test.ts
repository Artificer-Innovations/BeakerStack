import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';

describe('password recovery callback capture', () => {
  const originalLocation = window.location;
  const memSession: Record<string, string> = {};

  beforeEach(() => {
    vi.resetModules();
    Object.keys(memSession).forEach(k => delete memSession[k]);
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => (k in memSession ? memSession[k] : null),
      setItem: (k: string, v: string) => {
        memSession[k] = v;
      },
      removeItem: (k: string) => {
        delete memSession[k];
      },
    });
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('captures type=recovery from hash before createClient', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '#access_token=tok&type=recovery',
        search: '',
      },
    });

    const mod = await import('../supabase');

    expect(mod.isPasswordRecoveryCallback).toBe(true);
    expect(mod.hasPasswordRecoveryCallback()).toBe(true);
    expect(memSession[mod.RECOVERY_CALLBACK_STORAGE_KEY]).toBe('1');
  });

  it('captures type=recovery from query params', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '',
        search: '?type=recovery&access_token=tok',
      },
    });

    const mod = await import('../supabase');

    expect(mod.isPasswordRecoveryCallback).toBe(true);
    expect(mod.hasPasswordRecoveryCallback()).toBe(true);
  });

  it('reads persisted recovery flag from sessionStorage after hash is cleared', async () => {
    memSession['beakerstack:recovery_callback'] = '1';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '',
        search: '',
      },
    });

    const mod = await import('../supabase');

    expect(mod.isPasswordRecoveryCallback).toBe(false);
    expect(mod.hasPasswordRecoveryCallback()).toBe(true);
  });

  it('clearPasswordRecoveryCallback removes persisted flag', async () => {
    memSession['beakerstack:recovery_callback'] = '1';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '',
        search: '',
      },
    });

    const mod = await import('../supabase');
    mod.clearPasswordRecoveryCallback();

    expect(mod.hasPasswordRecoveryCallback()).toBe(false);
    expect(memSession['beakerstack:recovery_callback']).toBeUndefined();
  });

  it('clearPasswordRecoveryCallback clears recovery intent after in-module capture', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '#access_token=tok&type=recovery',
        search: '',
      },
    });

    const mod = await import('../supabase');

    expect(mod.isPasswordRecoveryCallback).toBe(true);
    expect(mod.hasPasswordRecoveryCallback()).toBe(true);

    mod.clearPasswordRecoveryCallback();

    expect(mod.hasPasswordRecoveryCallback()).toBe(false);
  });
});

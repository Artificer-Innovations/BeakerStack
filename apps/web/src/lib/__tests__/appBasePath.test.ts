import { describe, expect, it, afterEach, vi } from 'vitest';
import { appBasePath } from '../appBasePath';

describe('appBasePath', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty string when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined as unknown as Window & typeof globalThis);
    expect(appBasePath()).toBe('');
  });

  it('combines origin and vite base URL without trailing slash', () => {
    vi.stubEnv('BASE_URL', '/pr-9/');
    vi.stubGlobal('window', {
      location: { origin: 'https://example.com' },
    } as unknown as Window & typeof globalThis);
    expect(appBasePath()).toBe('https://example.com/pr-9');
    vi.unstubAllEnvs();
  });
});

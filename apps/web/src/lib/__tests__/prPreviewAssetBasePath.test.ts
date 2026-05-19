import { describe, it, expect, afterEach, vi } from 'vitest';
import { getPrPreviewAssetBasePath } from '../prPreviewAssetBasePath';

describe('getPrPreviewAssetBasePath', () => {
  const originalPathname = window.location.pathname;

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', originalPathname);
  });

  it('returns "/" when not under /pr-N', () => {
    window.history.replaceState({}, '', '/terms');
    expect(getPrPreviewAssetBasePath()).toBe('/');
  });

  it('returns preview segment prefix when pathname starts with /pr-N', () => {
    window.history.replaceState({}, '', '/pr-42/dashboard');
    expect(getPrPreviewAssetBasePath()).toBe('/pr-42/');
  });

  it('returns "/" in SSR/Node when window is undefined', () => {
    vi.stubGlobal('window', undefined as unknown as Window & typeof globalThis);
    expect(getPrPreviewAssetBasePath()).toBe('/');
  });
});

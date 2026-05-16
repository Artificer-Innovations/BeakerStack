import { describe, it, expect, afterEach } from 'vitest';
import { getPrPreviewAssetBasePath } from '../prPreviewAssetBasePath';

describe('getPrPreviewAssetBasePath', () => {
  const originalPathname = window.location.pathname;

  afterEach(() => {
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
});

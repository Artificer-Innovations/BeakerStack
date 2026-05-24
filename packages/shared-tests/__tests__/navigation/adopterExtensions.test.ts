import { resolveAdopterRouteAuth } from '@beakerstack/shared/navigation/adopterExtensions';

describe('resolveAdopterRouteAuth', () => {
  it('defaults undefined auth to protected', () => {
    expect(resolveAdopterRouteAuth(undefined)).toBe('protected');
  });

  it('returns explicit auth values unchanged', () => {
    expect(resolveAdopterRouteAuth('protected')).toBe('protected');
    expect(resolveAdopterRouteAuth('public')).toBe('public');
  });
});

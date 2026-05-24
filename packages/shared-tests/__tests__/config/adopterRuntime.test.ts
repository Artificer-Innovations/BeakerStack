import { adopterConfig } from '@adopter/config';
import {
  configureAdopter,
  ensureAdopterConfigured,
  getAdopterConfig,
  resetAdopterConfigForTests,
} from '@beakerstack/shared/config/adopterRuntime';

describe('adopterRuntime', () => {
  afterEach(() => {
    resetAdopterConfigForTests();
  });

  it('throws when reading config before configureAdopter()', () => {
    resetAdopterConfigForTests();

    expect(() => getAdopterConfig()).toThrow(
      /configureAdopter\(\) must be called before reading adopter config/
    );
  });

  it('returns configured adopter config', () => {
    resetAdopterConfigForTests();
    configureAdopter(adopterConfig);

    expect(getAdopterConfig()).toEqual(adopterConfig);
  });

  it('throws when configureAdopter() is called more than once in test', () => {
    resetAdopterConfigForTests();
    configureAdopter(adopterConfig);

    expect(() => configureAdopter(adopterConfig)).toThrow(
      /configureAdopter\(\) called more than once/
    );
  });

  it('warns once when configureAdopter() is called more than once outside test', () => {
    resetAdopterConfigForTests();
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      configureAdopter(adopterConfig);
      configureAdopter(adopterConfig);
      configureAdopter(adopterConfig);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'configureAdopter() called more than once; subsequent calls replace the config'
      );
      expect(getAdopterConfig()).toEqual(adopterConfig);
    } finally {
      warnSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('ensureAdopterConfigured() configures when unset', () => {
    resetAdopterConfigForTests();

    ensureAdopterConfigured(adopterConfig);

    expect(getAdopterConfig()).toEqual(adopterConfig);
  });

  it('ensureAdopterConfigured() is a no-op when config is already set', () => {
    resetAdopterConfigForTests();
    configureAdopter(adopterConfig);

    ensureAdopterConfigured({
      ...adopterConfig,
      postLoginPath: '/other',
    });

    expect(getAdopterConfig().postLoginPath).toBe('/dashboard');
  });

  it('resetAdopterConfigForTests() clears configured state', () => {
    resetAdopterConfigForTests();
    configureAdopter(adopterConfig);
    resetAdopterConfigForTests();

    expect(() => getAdopterConfig()).toThrow(
      /configureAdopter\(\) must be called before reading adopter config/
    );
  });
});

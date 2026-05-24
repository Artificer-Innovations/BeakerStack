try {
  require('@testing-library/jest-native/extend-expect');
} catch {
  /* optional @testing-library/jest-native */
}

// @ts-expect-error test setup assigns global __DEV__
global.__DEV__ = true;

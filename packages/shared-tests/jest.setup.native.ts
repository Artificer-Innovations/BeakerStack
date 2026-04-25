// If you still have @testing-library/jest-native installed and want it:
try {
  require('@testing-library/jest-native/extend-expect');
} catch {
  /* optional @testing-library/jest-native */
}

// Define React Native globals
// @ts-expect-error test setup assigns global __DEV__
global.__DEV__ = true;

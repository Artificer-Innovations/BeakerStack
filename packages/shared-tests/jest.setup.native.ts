// If you still have @testing-library/jest-native installed and want it:
try { require("@testing-library/jest-native/extend-expect"); } catch {}

// Define React Native globals
// @ts-ignore
global.__DEV__ = true;

/**
 * Jest stub for Metro’s `expo/virtual/env` alias (`shims/expo-virtual-env.js`).
 * The Expo Babel plugin rewrites EXPO_PUBLIC_* reads; it may use default and/or
 * named exports off this module.
 */
'use strict';

const base = (typeof process !== 'undefined' && process.env) || {};
const d = Object.assign({}, base);

module.exports = Object.assign(
  { __esModule: true, default: d },
  d
);

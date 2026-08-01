/**
 * Jest stub for Metro's `expo/virtual/env` alias.
 * Expo SDK 57's babel plugin rewrites `process.env.EXPO_PUBLIC_*` reads to:
 *   import { env } from 'expo/virtual/env'; env.EXPO_PUBLIC_*
 */
'use strict';

const env =
  typeof process !== 'undefined' &&
  process.env != null &&
  typeof process.env === 'object'
    ? process.env
    : {};

module.exports = {
  __esModule: true,
  env,
  default: { env },
};

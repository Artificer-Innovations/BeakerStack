/**
 * Fallback shim for expo/virtual/env (kept for reference / non-Metro tools).
 * Expo SDK 57 babel rewrites `process.env.EXPO_PUBLIC_*` to:
 *   import { env } from 'expo/virtual/env'; env.EXPO_PUBLIC_*
 * Metro should resolve the real virtual module; this file matches that shape
 * if something still points at the shim path.
 */
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra) || {};

const env = {
  ...(typeof process !== 'undefined' && process.env ? process.env : {}),
};

Object.keys(extra).forEach(key => {
  const envKey = key.startsWith('EXPO_PUBLIC_')
    ? key
    : `EXPO_PUBLIC_${String(key).toUpperCase()}`;
  env[envKey] = extra[key];
});
Object.assign(env, extra);

export { env };
export default { env };

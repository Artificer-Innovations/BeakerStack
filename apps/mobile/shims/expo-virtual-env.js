/**
 * Metro alias shim for expo/virtual/env
 * Reads environment variables from Constants.expoConfig.extra
 * This prevents build failures if a stray import remains in shared code
 */
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra) || {};

// Export all extra values as environment variables
// This mimics the behavior of expo/virtual/env which exposes EXPO_PUBLIC_* variables
const env = {};

// Convert extra keys to EXPO_PUBLIC_* format for compatibility
Object.keys(extra).forEach((key) => {
  const envKey = key.startsWith('EXPO_PUBLIC_') ? key : `EXPO_PUBLIC_${key.toUpperCase()}`;
  env[envKey] = extra[key];
});

// Also export direct key access (for backward compatibility)
Object.assign(env, extra);

export default env;



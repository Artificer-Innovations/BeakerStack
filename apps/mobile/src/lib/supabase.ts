import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/types/database';
import { Logger } from '@shared/utils/logger';

import Constants from 'expo-constants';
// Handle both expoConfig (SDK 49+) and manifest (older SDKs)
const config = Constants.expoConfig ?? Constants.manifest;
const extra = (
  config && 'extra' in config
    ? (config as { extra?: Record<string, unknown> }).extra
    : undefined
) as
  | {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    }
  | undefined;
let supabaseUrl = extra?.supabaseUrl;
const supabaseAnonKey = extra?.supabaseAnonKey;

// Android emulator needs 10.0.2.2 instead of 127.0.0.1 to reach host machine
if (
  supabaseUrl &&
  __DEV__ &&
  Platform.OS === 'android' &&
  supabaseUrl.includes('127.0.0.1')
) {
  supabaseUrl = supabaseUrl.replace('127.0.0.1', '10.0.2.2');
}

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

if (__DEV__) {
  const realtimeUrl = supabaseUrl.replace(/^http(s?)/, (_, secure) =>
    secure ? 'wss' : 'ws'
  );
  Logger.debug('[mobile.supabase] HTTP base URL:', supabaseUrl);
  Logger.debug(
    '[mobile.supabase] Realtime websocket URL:',
    `${realtimeUrl}/realtime/v1/websocket`
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type SupabaseClient = typeof supabase;

import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/types/database';

import Constants from "expo-constants";
const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra) as {
  supabaseUrl?: string; supabaseAnonKey?: string;
};
let supabaseUrl = extra?.supabaseUrl;
const supabaseAnonKey = extra?.supabaseAnonKey;

// Android emulator needs 10.0.2.2 instead of 127.0.0.1 to reach host machine
if (supabaseUrl && __DEV__ && Platform.OS === 'android' && supabaseUrl.includes('127.0.0.1')) {
  supabaseUrl = supabaseUrl.replace('127.0.0.1', '10.0.2.2');
}

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
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

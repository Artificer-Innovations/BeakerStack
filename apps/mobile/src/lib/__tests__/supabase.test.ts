import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Platform } from 'react-native';

// Mutable Expo extra so tests can vary URL/key after resetModules.
const expoExtraState: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
} = {
  supabaseUrl: 'http://localhost:54321',
  supabaseAnonKey: 'test-anon-key',
};

// Mock react-native-url-polyfill
jest.mock('react-native-url-polyfill/auto', () => ({}));

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock @supabase/supabase-js
const mockCreateClient = jest.fn();
const mockSupabaseClient = {
  from: jest.fn(),
  auth: {},
};
mockCreateClient.mockReturnValue(mockSupabaseClient);

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Mock Logger
const mockLoggerDebug = jest.fn();
const mockLoggerInfo = jest.fn();
jest.mock('@beakerstack/shared/utils/logger', () => ({
  Logger: {
    debug: mockLoggerDebug,
    info: mockLoggerInfo,
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('expo-constants', () => {
  return {
    __esModule: true,
    default: {
      get expoConfig() {
        return {
          extra: { ...expoExtraState },
        };
      },
    },
  };
});

describe('supabase.ts', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient);
    mockCreateClient.mockClear();
    mockLoggerDebug.mockClear();
    mockLoggerInfo.mockClear();
    expoExtraState.supabaseUrl = 'http://localhost:54321';
    expoExtraState.supabaseAnonKey = 'test-anon-key';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).__DEV__ = false;
    Platform.OS = 'ios';
  });

  it('should create supabase client with correct configuration', () => {
    const { supabase } = require('../supabase');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://localhost:54321',
      'test-anon-key',
      expect.objectContaining({
        auth: {
          storage: mockAsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    );
    expect(supabase).toBeDefined();
  });

  it('should export supabase client', () => {
    require('../supabase');
    const module = require('../supabase');

    expect(module).toHaveProperty('supabase');
    expect(module.supabase).toBeDefined();
  });

  it('rewrites 127.0.0.1 to 10.0.2.2 on Android in __DEV__', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).__DEV__ = true;
    Platform.OS = 'android';
    expoExtraState.supabaseUrl = 'http://127.0.0.1:54321';
    expoExtraState.supabaseAnonKey = 'test-anon-key';

    require('../supabase');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://10.0.2.2:54321',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.any(Object),
      })
    );
  });

  it('does not rewrite host when not on Android', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).__DEV__ = true;
    Platform.OS = 'ios';
    expoExtraState.supabaseUrl = 'http://127.0.0.1:54321';
    expoExtraState.supabaseAnonKey = 'test-anon-key';

    require('../supabase');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://127.0.0.1:54321',
      'test-anon-key',
      expect.anything()
    );
  });

  it('throws when supabase URL is missing', () => {
    delete expoExtraState.supabaseUrl;
    expoExtraState.supabaseAnonKey = 'test-anon-key';

    expect(() => require('../supabase')).toThrow(
      'Missing EXPO_PUBLIC_SUPABASE_URL environment variable'
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('throws when supabase anon key is missing', () => {
    expoExtraState.supabaseUrl = 'http://localhost:54321';
    delete expoExtraState.supabaseAnonKey;

    expect(() => require('../supabase')).toThrow(
      'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable'
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('logs websocket URL derived from Supabase URL', () => {
    expoExtraState.supabaseUrl = 'http://localhost:54321';
    expoExtraState.supabaseAnonKey = 'test-anon-key';

    require('../supabase');

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      '[mobile.supabase] Using Supabase URL:',
      'http://localhost:54321'
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      '[mobile.supabase] Realtime websocket URL:',
      'ws://localhost:54321/realtime/v1/websocket'
    );
  });
});

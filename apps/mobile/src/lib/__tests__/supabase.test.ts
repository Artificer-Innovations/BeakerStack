import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Platform } from 'react-native';

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
jest.mock('@shared/utils/logger', () => ({
  Logger: {
    debug: mockLoggerDebug,
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock expo-constants with default values
jest.mock('expo-constants', () => {
  return {
    __esModule: true,
    default: {
      expoConfig: {
        extra: {
          supabaseUrl: 'http://localhost:54321',
          supabaseAnonKey: 'test-anon-key',
        },
      },
    },
  };
});

describe('supabase.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockClear();
    mockLoggerDebug.mockClear();
  });

  it('should create supabase client with correct configuration', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).__DEV__ = false;
    Platform.OS = 'ios';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { supabase } = require('../supabase');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://localhost:54321',
      'test-anon-key',
      expect.objectContaining({
        auth: {
          storage: mockAsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    );
    expect(supabase).toBeDefined();
  });

  it('should export supabase client', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('../supabase');

    expect(module).toHaveProperty('supabase');
    expect(module.supabase).toBeDefined();
  });
});

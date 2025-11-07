/**
 * Supabase mocks for unit tests
 * Provides mock implementations of Supabase client methods
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Mock Supabase auth methods
 */
export interface MockAuth {
  signUp: jest.Mock;
  signInWithPassword: jest.Mock;
  signInWithOAuth: jest.Mock;
  signOut: jest.Mock;
  getSession: jest.Mock;
  getUser: jest.Mock;
  onAuthStateChange: jest.Mock;
}

/**
 * Mock Supabase client
 * Provides mock implementations for common Supabase operations
 */
export function createMockSupabaseClient(): Partial<SupabaseClient> {
  const mockAuth: MockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
  };

  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    limit: jest.fn().mockReturnThis(),
  }));

  return {
    auth: mockAuth as unknown as SupabaseClient['auth'],
    from: mockFrom as unknown as SupabaseClient['from'],
  } as Partial<SupabaseClient>;
}

/**
 * Create a mock successful auth response
 */
export function createMockAuthResponse(userId: string, email: string) {
  return {
    data: {
      user: {
        id: userId,
        email,
        created_at: new Date().toISOString(),
      },
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        user: {
          id: userId,
          email,
        },
      },
    },
    error: null,
  };
}

/**
 * Create a mock error response
 */
export function createMockErrorResponse(message: string) {
  return {
    data: {
      user: null,
      session: null,
    },
    error: {
      message,
      status: 400,
    },
  };
}

/**
 * Create a mock successful database response
 */
export function createMockDbResponse<T>(data: T) {
  return {
    data,
    error: null,
  };
}

/**
 * Create a mock database error response
 */
export function createMockDbErrorResponse(message: string) {
  return {
    data: null,
    error: {
      message,
      code: 'PGRST_ERROR',
      details: message,
      hint: null,
    },
  };
}

/**
 * Reset all mocks
 */
export function resetMocks(mockClient: Partial<SupabaseClient>) {
  if (mockClient.auth) {
    const auth = mockClient.auth as unknown as MockAuth;
    Object.values(auth).forEach((mock) => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
  }

  if (mockClient.from && jest.isMockFunction(mockClient.from)) {
    mockClient.from.mockReset();
  }
}


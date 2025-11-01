import React from 'react';
import { renderHook, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuthContext } from '../../src/contexts/AuthContext';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUser,
  };

  const mockClient = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: 'https://oauth-url.com' },
        error: null,
      }),
      onAuthStateChange: jest.fn((callback) => {
        // Immediately call with the session
        setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      }),
    },
  } as unknown as SupabaseClient;

  return { mockClient, mockUser, mockSession };
};

describe('AuthContext', () => {
  it('should throw error when useAuthContext is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow('useAuthContext must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should provide auth state to children components', async () => {
    const { mockClient, mockUser } = createMockSupabaseClient();

    function TestComponent() {
      const auth = useAuthContext();
      return (
        <div>
          <div data-testid="loading">{auth.loading ? 'loading' : 'ready'}</div>
          <div data-testid="user">{auth.user?.email || 'no-user'}</div>
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    // Wait for auth state to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    // Should have user email
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email!);
    });
  });

  it('should provide auth actions to children components', async () => {
    const { mockClient } = createMockSupabaseClient();

    function TestComponent() {
      const auth = useAuthContext();
      return (
        <div>
          <button onClick={() => auth.signIn('test@example.com', 'password')}>
            Sign In
          </button>
          <button onClick={() => auth.signOut()}>Sign Out</button>
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('should allow multiple components to access the same auth state', async () => {
    const { mockClient, mockUser } = createMockSupabaseClient();

    function Component1() {
      const auth = useAuthContext();
      return <div data-testid="component1-user">{auth.user?.email || 'no-user'}</div>;
    }

    function Component2() {
      const auth = useAuthContext();
      return <div data-testid="component2-user">{auth.user?.email || 'no-user'}</div>;
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <Component1 />
        <Component2 />
      </AuthProvider>
    );

    // Both components should have access to the same user
    await waitFor(() => {
      expect(screen.getByTestId('component1-user')).toHaveTextContent(mockUser.email!);
      expect(screen.getByTestId('component2-user')).toHaveTextContent(mockUser.email!);
    });
  });

  it('should provide session state to children', async () => {
    const { mockClient, mockSession } = createMockSupabaseClient();

    function TestComponent() {
      const auth = useAuthContext();
      return (
        <div data-testid="session">
          {auth.session ? 'has-session' : 'no-session'}
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('has-session');
    });
  });

  it('should provide error state to children', async () => {
    const { mockClient } = createMockSupabaseClient();

    function TestComponent() {
      const auth = useAuthContext();
      return (
        <div data-testid="error">
          {auth.error ? auth.error.message : 'no-error'}
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });
});


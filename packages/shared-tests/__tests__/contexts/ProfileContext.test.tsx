import React from 'react';
import { renderHook, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ProfileProvider,
  useProfileContext,
} from '@shared/src/contexts/ProfileContext';
import { AuthProvider } from '@shared/src/contexts/AuthContext';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@shared/src/types/profile';

// Mock profile data
const mockProfile: UserProfile = {
  user_id: 'test-user-id',
  username: 'testuser',
  display_name: 'Test User',
  bio: 'Test bio',
  avatar_url: 'https://example.com/avatar.jpg',
  website: 'https://example.com',
  location: 'Test Location',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

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

  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(callback => {
      callback('SUBSCRIBED');
      return mockChannel;
    }),
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
      onAuthStateChange: jest.fn(callback => {
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
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    })),
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
  } as unknown as SupabaseClient;

  return { mockClient, mockUser, mockSession, mockProfile };
};

describe('ProfileContext', () => {
  it('should throw error when useProfileContext is used outside ProfileProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useProfileContext());
    }).toThrow('useProfileContext must be used within a ProfileProvider');

    consoleSpy.mockRestore();
  });

  it('should provide profile state to children components', async () => {
    const { mockClient, mockProfile } = createMockSupabaseClient();

    function TestComponent() {
      const profile = useProfileContext();
      return (
        <div>
          <div data-testid='loading'>
            {profile.loading ? 'loading' : 'ready'}
          </div>
          <div data-testid='profile'>
            {profile.profile?.username || 'no-profile'}
          </div>
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          <TestComponent />
        </ProfileProvider>
      </AuthProvider>
    );

    // Wait for profile state to load
    await waitFor(
      () => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      },
      { timeout: 3000 }
    );

    // Should have profile username
    await waitFor(() => {
      expect(screen.getByTestId('profile')).toHaveTextContent(
        mockProfile.username!
      );
    });
  });

  it('should allow multiple components to access the same profile state', async () => {
    const { mockClient, mockProfile } = createMockSupabaseClient();

    function Component1() {
      const profile = useProfileContext();
      return (
        <div data-testid='component1-profile'>
          {profile.profile?.username || 'no-profile'}
        </div>
      );
    }

    function Component2() {
      const profile = useProfileContext();
      return (
        <div data-testid='component2-profile'>
          {profile.profile?.username || 'no-profile'}
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          <Component1 />
          <Component2 />
        </ProfileProvider>
      </AuthProvider>
    );

    // Both components should have access to the same profile
    await waitFor(
      () => {
        expect(screen.getByTestId('component1-profile')).toHaveTextContent(
          mockProfile.username!
        );
        expect(screen.getByTestId('component2-profile')).toHaveTextContent(
          mockProfile.username!
        );
      },
      { timeout: 3000 }
    );
  });

  it('should provide profile actions to children components', async () => {
    const { mockClient } = createMockSupabaseClient();

    function TestComponent() {
      const profile = useProfileContext();
      return (
        <div>
          <button
            onClick={() =>
              profile.updateProfile('test-user-id', { bio: 'New bio' })
            }
          >
            Update Profile
          </button>
          <button onClick={() => profile.refreshProfile()}>Refresh</button>
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          <TestComponent />
        </ProfileProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Update Profile')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('should provide error state to children', async () => {
    const { mockClient } = createMockSupabaseClient();

    // Suppress console.error for this test since we expect an error to be thrown
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Override the from method to return an error
    (mockClient.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch profile', code: 'ERROR' },
      }),
    });

    function TestComponent() {
      const profile = useProfileContext();
      return (
        <div data-testid='error'>
          {profile.error ? profile.error.message : 'no-error'}
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          <TestComponent />
        </ProfileProvider>
      </AuthProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'Failed to fetch profile'
        );
      },
      { timeout: 3000 }
    );

    consoleSpy.mockRestore();
  });

  it('should handle missing profile (user has not created profile yet)', async () => {
    const { mockClient } = createMockSupabaseClient();

    // Override the from method to return PGRST116 error (not found)
    (mockClient.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      }),
    });

    function TestComponent() {
      const profile = useProfileContext();
      return (
        <div>
          <div data-testid='profile'>
            {profile.profile ? 'has-profile' : 'no-profile'}
          </div>
          <div data-testid='error'>
            {profile.error ? profile.error.message : 'no-error'}
          </div>
        </div>
      );
    }

    render(
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          <TestComponent />
        </ProfileProvider>
      </AuthProvider>
    );

    // Should handle missing profile gracefully (no error)
    await waitFor(
      () => {
        expect(screen.getByTestId('profile')).toHaveTextContent('no-profile');
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      },
      { timeout: 3000 }
    );
  });
});

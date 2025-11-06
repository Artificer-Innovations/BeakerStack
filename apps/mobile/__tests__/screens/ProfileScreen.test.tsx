import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../../src/screens/ProfileScreen';
import { AuthProvider } from '@shared/contexts/AuthContext';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock the supabase client import
jest.mock('../../src/lib/supabase', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows returned' },
        }),
      })),
    })),
  }));
  
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

// Mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: mockReplace,
} as any;

// Mock the profile display components
jest.mock('@shared/components/profile/ProfileHeader.native', () => ({
  ProfileHeader: ({ profile }: any) => (
    <div testID="profile-header">
      {profile ? `Profile: ${profile.display_name || profile.username}` : 'No profile'}
    </div>
  ),
}));

jest.mock('@shared/components/profile/ProfileStats.native', () => ({
  ProfileStats: ({ profile }: any) => (
    profile ? <div testID="profile-stats">Stats</div> : null
  ),
}));

jest.mock('@shared/components/profile/ProfileEditor.native', () => ({
  ProfileEditor: ({ user }: any) => (
    <div testID="profile-editor">
      {user ? 'Editor' : 'No user'}
    </div>
  ),
}));

describe('ProfileScreen', () => {
  let mockSupabaseClient: Partial<SupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database query for useProfile hook
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        })),
      })),
    }));
    
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    } as any;
  });

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(
      <AuthProvider supabaseClient={mockSupabaseClient as SupabaseClient}>
        {ui}
      </AuthProvider>
    );
  };

  it('renders profile screen', async () => {
    const { getByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );
    
    await waitFor(() => {
      expect(getByText('Profile')).toBeTruthy();
    });
  });

  it('displays user email when authenticated', async () => {
    const { getByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );
    
    await waitFor(() => {
      expect(getByText('test@example.com')).toBeTruthy();
    });
  });

  it('shows dashboard navigation button', async () => {
    const { getByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );
    
    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy();
    });
  });

  it('redirects to login when not authenticated', async () => {
    mockSupabaseClient.auth!.getSession = jest.fn().mockResolvedValue({
      data: {
        session: null,
      },
    });

    renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );
    
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Login');
    }, { timeout: 2000 });
  });

  it('shows loading state while checking authentication', () => {
    mockSupabaseClient.auth!.getSession = jest.fn().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { getByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );
    
    expect(getByText('Loading...')).toBeTruthy();
  });
});


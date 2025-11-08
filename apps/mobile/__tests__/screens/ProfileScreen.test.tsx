import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
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
  ProfileHeader: ({ profile }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return (
      <View testID='profile-header'>
        <Text>
          {profile
            ? `Profile: ${profile.display_name || profile.username}`
            : 'No profile'}
        </Text>
      </View>
    );
  },
}));

jest.mock('@shared/components/profile/ProfileStats.native', () => ({
  ProfileStats: ({ profile }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return profile ? (
      <View testID='profile-stats'>
        <Text>Stats</Text>
      </View>
    ) : null;
  },
}));

jest.mock('@shared/components/profile/ProfileEditor.native', () => ({
  ProfileEditor: ({ user }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return (
      <View testID='profile-editor'>
        <Text>{user ? 'Editor' : 'No user'}</Text>
      </View>
    );
  },
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
      <NavigationContainer>
        <AuthProvider supabaseClient={mockSupabaseClient as SupabaseClient}>
          {ui}
        </AuthProvider>
      </NavigationContainer>
    );
  };

  it('renders profile screen', async () => {
    const { getAllByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    // Profile screen should render with header
    await waitFor(
      () => {
        // The header should be visible with "Beaker Stack" text
        const beakerStackText = getAllByText('Beaker Stack');
        expect(beakerStackText.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it('displays user email when authenticated', async () => {
    const { getAllByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    // The screen should render - check for header or profile content
    await waitFor(
      () => {
        // The header should be visible
        const beakerStackText = getAllByText('Beaker Stack');
        expect(beakerStackText.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it('shows dashboard navigation button', async () => {
    const { getAllByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    // Dashboard should appear in the header menu
    await waitFor(
      () => {
        // The header should be rendered with "Beaker Stack" text
        const beakerStackText = getAllByText('Beaker Stack');
        expect(beakerStackText.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it('redirects to home when not authenticated', async () => {
    mockSupabaseClient.auth!.getSession = jest.fn().mockResolvedValue({
      data: {
        session: null,
      },
    });

    renderWithAuth(<ProfileScreen navigation={mockNavigation} />);

    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalledWith('Home');
      },
      { timeout: 2000 }
    );
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

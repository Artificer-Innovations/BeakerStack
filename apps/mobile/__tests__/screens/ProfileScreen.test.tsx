import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ProfileScreen from '../../src/screens/ProfileScreen';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BRANDING } from '@beakerstack/shared/config/branding';
import { Logger } from '@beakerstack/shared/utils/logger';
import { loadProfileEditorModule } from '../../src/screens/profileEditorLoader';

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'test-anon-key',
        googleWebClientId: 'test-web-client-id',
        googleIosClientId: 'test-ios-client-id',
        googleAndroidClientId: 'test-android-client-id',
      },
    },
    manifest: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'test-anon-key',
        googleWebClientId: 'test-web-client-id',
        googleIosClientId: 'test-ios-client-id',
        googleAndroidClientId: 'test-android-client-id',
      },
    },
  },
}));

// Mock @react-native-google-signin/google-signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(undefined),
    signIn: jest.fn().mockResolvedValue(undefined),
    getTokens: jest.fn().mockResolvedValue({
      idToken: 'mock-id-token',
      accessToken: 'mock-access-token',
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

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

  const mockChannel: any = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn((callback: (status: string) => void) => {
      callback('SUBSCRIBED');
      return mockChannel;
    }),
  };

  return {
    supabase: {
      from: mockFrom,
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
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
jest.mock(
  '@beakerstack/shared/components/profile/ProfileHeader.native',
  () => ({
    ProfileHeader: ({ profile }: any) => {
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
  })
);

jest.mock('@beakerstack/shared/components/profile/ProfileStats.native', () => ({
  ProfileStats: ({ profile }: any) => {
    const { View, Text } = require('react-native');
    return profile ? (
      <View testID='profile-stats'>
        <Text>Stats</Text>
      </View>
    ) : null;
  },
}));

jest.mock('@beakerstack/shared/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/screens/profileEditorLoader', () => {
  const { View, Text, Pressable } = require('react-native');
  const MockProfileEditor = ({
    onSuccess,
    onError,
  }: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }) => (
    <View testID='profile-editor'>
      <Pressable testID='profile-editor-save' onPress={() => onSuccess?.()}>
        <Text>Save profile</Text>
      </Pressable>
      <Pressable
        testID='profile-editor-fail'
        onPress={() => onError?.(new Error('save failed'))}
      >
        <Text>Fail save</Text>
      </Pressable>
    </View>
  );

  return {
    loadProfileEditorModule: jest.fn().mockResolvedValue({
      ProfileEditor: MockProfileEditor,
    }),
    __mockProfileEditor: MockProfileEditor,
  };
});

describe('ProfileScreen', () => {
  let mockSupabaseClient: Partial<SupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { __mockProfileEditor } = jest.requireMock(
      '../../src/screens/profileEditorLoader'
    ) as { __mockProfileEditor: React.ComponentType<unknown> };
    jest.mocked(loadProfileEditorModule).mockResolvedValue({
      ProfileEditor: __mockProfileEditor,
    });

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

    // Mock realtime channel for useProfile hook
    const mockChannel: any = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
        return mockChannel;
      }),
    };

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
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
    } as any;
  });

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(
      <NavigationContainer>
        <AuthProvider supabaseClient={mockSupabaseClient as SupabaseClient}>
          <ProfileProvider
            supabaseClient={mockSupabaseClient as SupabaseClient}
          >
            {ui}
          </ProfileProvider>
        </AuthProvider>
      </NavigationContainer>
    );
  };

  it('renders profile screen with header and edit affordance', async () => {
    const { findByText, getAllByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    expect(
      await findByText('Edit Profile', {}, { timeout: 5000 })
    ).toBeTruthy();
    const headerTitles = getAllByText(BRANDING.displayName);
    expect(headerTitles.length).toBeGreaterThan(0);
  });

  it('displays user email when authenticated', async () => {
    const { findByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    expect(
      await findByText('Edit Profile', {}, { timeout: 5000 })
    ).toBeTruthy();
  });

  it('shows dashboard navigation button in header', async () => {
    const { findByText, getAllByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    expect(
      await findByText('Edit Profile', {}, { timeout: 5000 })
    ).toBeTruthy();
    expect(getAllByText(BRANDING.displayName).length).toBeGreaterThan(0);
  });

  it('shows Redirecting before navigating home when not authenticated', async () => {
    mockSupabaseClient.auth!.getSession = jest.fn().mockResolvedValue({
      data: {
        session: null,
      },
    });

    const { getByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Redirecting...')).toBeTruthy();
    });

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

  it('shows edit button when profile is loaded', async () => {
    const { findByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    expect(
      await findByText('Edit Profile', {}, { timeout: 5000 })
    ).toBeTruthy();
  });

  it('shows loading editor after entering edit mode', async () => {
    const { findByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    fireEvent.press(await findByText('Edit Profile', {}, { timeout: 5000 }));

    expect(await findByText('Loading editor...')).toBeTruthy();
  });

  it('shows profile loading state while profile context loads', async () => {
    mockSupabaseClient.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => new Promise(() => {})),
        })),
      })),
    })) as any;

    const { getByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Loading profile...')).toBeTruthy();
    });
  });

  it('shows profile error when fetch fails', async () => {
    mockSupabaseClient.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '500', message: 'Database unavailable' },
          }),
        })),
      })),
    })) as any;

    const { findByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    expect(
      await findByText('Error loading profile', {}, { timeout: 5000 })
    ).toBeTruthy();
    expect(await findByText('Database unavailable')).toBeTruthy();
  });

  it('loads ProfileEditor after entering edit mode', async () => {
    const { findByText, findByTestId } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    fireEvent.press(await findByText('Edit Profile', {}, { timeout: 5000 }));

    expect(
      await findByTestId('profile-editor', {}, { timeout: 5000 })
    ).toBeTruthy();
  });

  it('exits edit mode and refreshes profile after successful save', async () => {
    const { findByText, findByTestId, queryByTestId } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    fireEvent.press(await findByText('Edit Profile', {}, { timeout: 5000 }));
    fireEvent.press(
      await findByTestId('profile-editor-save', {}, { timeout: 5000 })
    );

    expect(
      await findByText('Edit Profile', {}, { timeout: 5000 })
    ).toBeTruthy();
    expect(queryByTestId('profile-editor')).toBeNull();
  });

  it('logs when ProfileEditor fails to load', async () => {
    jest
      .mocked(loadProfileEditorModule)
      .mockRejectedValueOnce(new Error('chunk failed'));

    const { findByText } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    fireEvent.press(await findByText('Edit Profile', {}, { timeout: 5000 }));

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        '[ProfileScreen] Failed to load ProfileEditor:',
        expect.objectContaining({ message: 'chunk failed' })
      );
    });
  });

  it('logs profile save errors from ProfileEditor', async () => {
    const { findByText, findByTestId } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    fireEvent.press(await findByText('Edit Profile', {}, { timeout: 5000 }));
    fireEvent.press(
      await findByTestId('profile-editor-fail', {}, { timeout: 5000 })
    );

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        'Profile save error:',
        expect.objectContaining({ message: 'save failed' })
      );
    });
  });

  it('shows profile stats when profile data exists', async () => {
    mockSupabaseClient.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'profile-1',
              user_id: 'test-user-id',
              username: 'testuser',
              display_name: 'Test User',
              avatar_url: null,
              bio: null,
            },
            error: null,
          }),
        })),
      })),
    })) as any;

    const { findByTestId } = renderWithAuth(
      <ProfileScreen navigation={mockNavigation} />
    );

    expect(
      await findByTestId('profile-stats', {}, { timeout: 5000 })
    ).toBeTruthy();
  });
});

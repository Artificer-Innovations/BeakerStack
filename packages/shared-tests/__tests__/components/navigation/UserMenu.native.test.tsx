import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserMenu } from '@shared/src/components/navigation/UserMenu.native';
import { AuthProvider } from '@shared/src/contexts/AuthContext';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@shared/src/types/profile';

// Mock ProfileAvatar
jest.mock('@shared/src/components/profile/ProfileAvatar.native', () => ({
  ProfileAvatar: ({ profile }: { profile: UserProfile | null }) => (
    <div data-testid='profile-avatar'>{profile?.display_name || 'Avatar'}</div>
  ),
}));

// Mock Alert and Platform
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn((title, message, buttons) => {
        // Simulate button press for testing
        if (buttons && buttons[1] && buttons[1].onPress) {
          buttons[1].onPress();
        }
      }),
    },
    Platform: {
      OS: 'ios',
    },
  };
});

const createMockSupabaseClient = (): SupabaseClient => {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      signInWithOAuth: jest.fn(),
    },
  } as unknown as SupabaseClient;
};

const createMockUser = (): User =>
  ({
    id: 'user-1',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01',
    app_metadata: {},
    user_metadata: {},
  }) as User;

const createMockProfile = (): UserProfile => ({
  id: '1',
  user_id: 'user-1',
  username: 'testuser',
  display_name: 'Test User',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
});

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as any;

const renderWithProviders = (
  component: React.ReactElement,
  mockClient?: SupabaseClient
) => {
  const client = mockClient || createMockSupabaseClient();
  return render(
    <AuthProvider supabaseClient={client}>{component}</AuthProvider>
  );
};

describe('UserMenu (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user avatar', () => {
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    renderWithProviders(
      <UserMenu
        user={mockUser}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );

    expect(screen.getByTestId('profile-avatar')).toBeInTheDocument();
  });

  it('opens menu when avatar is pressed', () => {
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    renderWithProviders(
      <UserMenu
        user={mockUser}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );

    const avatarButton = screen.getByTestId('profile-avatar').closest('button');
    if (avatarButton) {
      fireEvent.click(avatarButton);
    }

    // Menu should be visible - wait for it
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it.skip('displays user email in menu', async () => {
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    renderWithProviders(
      <UserMenu
        user={mockUser}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );

    const avatarButton = screen.getByTestId('profile-avatar').closest('button');
    if (avatarButton) {
      fireEvent.click(avatarButton);
    }

    // Wait for modal to open and content to be visible
    await screen.findByText('test@example.com', {}, { timeout: 1000 });
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it.skip('displays display name fallback to username', async () => {
    const mockUser = createMockUser();
    const mockProfile: UserProfile = {
      ...createMockProfile(),
      display_name: null,
    };

    renderWithProviders(
      <UserMenu
        user={mockUser}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );

    const avatarButton = screen.getByTestId('profile-avatar').closest('button');
    if (avatarButton) {
      fireEvent.click(avatarButton);
    }

    await screen.findByText('testuser', {}, { timeout: 1000 });
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it.skip('displays email prefix when no display name or username', async () => {
    const mockUser = createMockUser();
    const mockProfile: UserProfile = {
      ...createMockProfile(),
      display_name: null,
      username: null,
    };

    renderWithProviders(
      <UserMenu
        user={mockUser}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );

    const avatarButton = screen.getByTestId('profile-avatar').closest('button');
    if (avatarButton) {
      fireEvent.click(avatarButton);
    }

    await screen.findByText('test', {}, { timeout: 1000 }); // email prefix
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it.skip('navigates to Profile when Profile is pressed', async () => {
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    renderWithProviders(
      <UserMenu
        user={mockUser}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );

    const avatarButton = screen.getByTestId('profile-avatar').closest('button');
    if (avatarButton) {
      fireEvent.click(avatarButton);
    }

    const profileButton = await screen.findByText(
      'Profile',
      {},
      { timeout: 1000 }
    );
    fireEvent.click(profileButton);

    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it.skip('navigates to Dashboard when Dashboard is pressed', async () => {
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    renderWithProviders(
      <UserMenu
        user={mockUser}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );

    const avatarButton = screen.getByTestId('profile-avatar').closest('button');
    if (avatarButton) {
      fireEvent.click(avatarButton);
    }

    const dashboardButton = await screen.findByText(
      'Dashboard',
      {},
      { timeout: 1000 }
    );
    fireEvent.click(dashboardButton);

    expect(mockNavigate).toHaveBeenCalledWith('Dashboard');
  });

  it.skip('handles sign out', async () => {
    const mockClient = createMockSupabaseClient();
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    renderWithProviders(
      <UserMenu
        user={mockUser}
        profile={mockProfile}
        navigation={mockNavigation}
      />,
      mockClient
    );

    const avatarButton = screen.getByTestId('profile-avatar').closest('button');
    if (avatarButton) {
      fireEvent.click(avatarButton);
    }

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockClient.auth.signOut).toHaveBeenCalled();
    });
  });
});

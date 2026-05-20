import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserMenu } from '@beakerstack/shared/components/navigation/UserMenu.native';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@beakerstack/shared/types/profile';

jest.mock('@beakerstack/shared/components/profile/ProfileAvatar.native', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    ProfileAvatar: () =>
      React.createElement(RN.View, { testID: 'profile-avatar' }),
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  /** Must match `USER_MENU_TEST_PLATFORM_OS_KEY` below. */
  const key = '__BeakerStack_UserMenuNativeTest_platformOs';
  const platformOsRef = (): { current: string } => {
    const g = globalThis as Record<string, { current: string } | undefined>;
    if (!g[key]) {
      g[key] = { current: 'ios' };
    }
    return g[key]!;
  };
  return {
    ...RN,
    Alert: {
      alert: jest.fn(
        (
          _title: string,
          _message: string,
          buttons?: { text?: string; style?: string; onPress?: () => void }[]
        ) => {
          const signOut = buttons?.find(b => b?.style === 'destructive');
          void signOut?.onPress?.();
        }
      ),
    },
    Modal: ({
      visible,
      children,
      onRequestClose,
    }: {
      visible: boolean;
      children: unknown;
      onRequestClose?: () => void;
    }) => {
      const React = require('react');
      return visible
        ? React.createElement(
            'motion',
            { 'data-testid': 'user-menu-modal' },
            children,
            onRequestClose
              ? React.createElement('button', {
                  type: 'button',
                  'data-testid': 'modal-request-close',
                  onClick: onRequestClose,
                })
              : null
          )
        : null;
    },
    Platform: {
      ...RN.Platform,
      get OS() {
        return platformOsRef().current;
      },
    },
  };
});

const USER_MENU_TEST_PLATFORM_OS_KEY =
  '__BeakerStack_UserMenuNativeTest_platformOs';

function userMenuPlatformOsRef(): { current: string } {
  const g = globalThis as Record<string, { current: string } | undefined>;
  if (!g[USER_MENU_TEST_PLATFORM_OS_KEY]) {
    g[USER_MENU_TEST_PLATFORM_OS_KEY] = { current: 'ios' };
  }
  return g[USER_MENU_TEST_PLATFORM_OS_KEY]!;
}

const createMockSupabaseClient = (): SupabaseClient =>
  ({
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
  }) as unknown as SupabaseClient;

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

/** RN-web measures layout asynchronously (setTimeout in UIManager.measure). */
const openMenu = async () => {
  fireEvent.click(screen.getByLabelText('Open user menu'));
  await screen.findByText('Profile');
};

describe('UserMenu (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userMenuPlatformOsRef().current = 'ios';
  });

  it('renders user avatar', () => {
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    expect(screen.getByTestId('profile-avatar')).toBeInTheDocument();
  });

  it('opens menu when avatar is pressed', async () => {
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays user email in menu', async () => {
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays display name fallback to username', async () => {
    const mockProfile: UserProfile = {
      ...createMockProfile(),
      display_name: null,
    };
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('displays email prefix when no display name or username', async () => {
    const mockProfile: UserProfile = {
      ...createMockProfile(),
      display_name: null,
      username: null,
    };
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={mockProfile}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    expect(screen.getByText(/^test$/)).toBeInTheDocument();
  });

  it('navigates to Profile when Profile is pressed', async () => {
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    fireEvent.click(screen.getByText('Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('navigates to Billing when Billing is pressed', async () => {
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    fireEvent.click(screen.getByText('Billing'));
    expect(mockNavigate).toHaveBeenCalledWith('Billing');
  });

  it('navigates to Dashboard when Dashboard is pressed', async () => {
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    fireEvent.click(screen.getByText('Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('Dashboard');
  });

  it('signs out and navigates home after confirming', async () => {
    const mockClient = createMockSupabaseClient();
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />,
      mockClient
    );
    await openMenu();
    fireEvent.click(screen.getByText('Sign Out'));
    await waitFor(() => {
      expect(mockClient.auth.signOut).toHaveBeenCalled();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('uses Android-style menu positioning when Platform.OS is android', async () => {
    userMenuPlatformOsRef().current = 'android';
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('closes menu when sign out is cancelled', async () => {
    const { Alert } = require('react-native');
    (Alert.alert as jest.Mock).mockImplementationOnce(
      (
        _title: string,
        _message: string,
        buttons?: { text?: string; style?: string; onPress?: () => void }[]
      ) => {
        const cancel = buttons?.find(b => b?.style === 'cancel');
        cancel?.onPress?.();
      }
    );

    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    fireEvent.click(screen.getByText('Sign Out'));
    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('closes menu on Modal onRequestClose', async () => {
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    fireEvent.click(screen.getByTestId('modal-request-close'));
    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  it('shows display name fallback when profile and email are missing', async () => {
    const userWithoutEmail = {
      ...createMockUser(),
      email: undefined,
    } as User;
    renderWithProviders(
      <UserMenu
        user={userWithoutEmail}
        profile={null}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('closes menu when overlay is pressed', async () => {
    renderWithProviders(
      <UserMenu
        user={createMockUser()}
        profile={createMockProfile()}
        navigation={mockNavigation}
      />
    );
    await openMenu();
    const overlay = screen.getByTestId('user-menu-modal').firstChild;
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay as Element);
    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });
});

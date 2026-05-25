import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.native';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import * as AuthContext from '@beakerstack/shared/contexts/AuthContext';
import * as ProfileContext from '@beakerstack/shared/contexts/ProfileContext';
import type { User } from '@supabase/supabase-js';

// Mock React Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const APP_HEADER_PLATFORM_OS_KEY =
  '__BeakerStack_AppHeaderNativeTest_platformOs';

const APP_HEADER_STATUS_BAR_HEIGHT_KEY =
  '__BeakerStack_AppHeaderNativeTest_statusBarHeight';

function appHeaderPlatformOsRef(): { current: string } {
  const g = globalThis as Record<string, { current: string } | undefined>;
  if (!g[APP_HEADER_PLATFORM_OS_KEY]) {
    g[APP_HEADER_PLATFORM_OS_KEY] = { current: 'ios' };
  }
  return g[APP_HEADER_PLATFORM_OS_KEY]!;
}

function appHeaderStatusBarHeightRef(): { current: number | null } {
  const g = globalThis as Record<
    string,
    { current: number | null } | undefined
  >;
  if (!g[APP_HEADER_STATUS_BAR_HEIGHT_KEY]) {
    g[APP_HEADER_STATUS_BAR_HEIGHT_KEY] = { current: 24 };
  }
  return g[APP_HEADER_STATUS_BAR_HEIGHT_KEY]!;
}

// Mock Platform (toggle OS via appHeaderPlatformOsRef in tests)
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const key = APP_HEADER_PLATFORM_OS_KEY;
  const statusBarKey = '__BeakerStack_AppHeaderNativeTest_statusBarHeight';
  const platformOsRef = (): { current: string } => {
    const g = globalThis as Record<string, { current: string } | undefined>;
    if (!g[key]) {
      g[key] = { current: 'ios' };
    }
    return g[key]!;
  };
  const statusBarHeightRef = (): { current: number | null } => {
    const g = globalThis as Record<
      string,
      { current: number | null } | undefined
    >;
    if (!g[statusBarKey]) {
      g[statusBarKey] = { current: 24 };
    }
    return g[statusBarKey]!;
  };
  return {
    ...RN,
    Platform: {
      ...RN.Platform,
      get OS() {
        return platformOsRef().current;
      },
    },
    StatusBar: {
      get currentHeight() {
        return platformOsRef().current === 'android'
          ? statusBarHeightRef().current
          : 0;
      },
    },
  };
});

// Mock UserMenu
jest.mock('@beakerstack/shared/components/navigation/UserMenu.native', () => ({
  UserMenu: ({
    user: _user,
    profile: _profile,
  }: {
    user: any;
    profile: any;
  }) => <div data-testid='user-menu'>User Menu</div>,
}));

// react-native-svg is mocked via moduleNameMapper

const createMockSupabaseClient = (hasProfile = false): SupabaseClient => {
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
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: hasProfile
              ? {
                  id: '1',
                  user_id: '1',
                  username: 'testuser',
                  display_name: 'Test User',
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                }
              : null,
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
};

const renderWithProviders = (
  component: React.ReactElement,
  mockClient?: SupabaseClient
) => {
  const client = mockClient || createMockSupabaseClient();
  return render(
    <AuthProvider supabaseClient={client}>
      <ProfileProvider supabaseClient={client}>{component}</ProfileProvider>
    </AuthProvider>
  );
};

describe('AppHeader (Native)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    appHeaderPlatformOsRef().current = 'ios';
    appHeaderStatusBarHeightRef().current = 24;
  });

  it('renders app title', () => {
    renderWithProviders(
      <AppHeader supabaseClient={createMockSupabaseClient()} />
    );
    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
  });

  it('renders app icon', () => {
    renderWithProviders(
      <AppHeader supabaseClient={createMockSupabaseClient()} />
    );
    expect(screen.getByTestId('svg-icon')).toBeInTheDocument();
  });

  it('navigates to Home when logo is pressed', () => {
    renderWithProviders(
      <AppHeader supabaseClient={createMockSupabaseClient()} />
    );
    // Find the TouchableOpacity that contains the title
    const title = screen.getByText(getAdopterConfig().branding.displayName);
    const logoButton = title.closest('button') || title.parentElement;
    if (logoButton) {
      fireEvent.click(logoButton);
    }
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('renders Sign In and Sign Up buttons when user is not authenticated', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderWithProviders(<AppHeader supabaseClient={mockClient} />);

    // Wait for auth state to resolve
    await screen.findByText('Sign In', {}, { timeout: 2000 });

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('navigates to Login when Sign In is pressed', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderWithProviders(<AppHeader supabaseClient={mockClient} />);

    await screen.findByText('Sign In', {}, { timeout: 2000 });

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('navigates to Signup when Sign Up is pressed', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderWithProviders(<AppHeader supabaseClient={mockClient} />);

    await screen.findByText('Sign Up', {}, { timeout: 2000 });

    const signUpButton = screen.getByText('Sign Up');
    fireEvent.click(signUpButton);
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });

  it('renders UserMenu when user is authenticated', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01',
    } as User;

    jest.spyOn(AuthContext, 'useAuthContext').mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithGoogle: jest.fn(),
      requestPasswordReset: jest.fn(),
      updatePassword: jest.fn(),
    });
    jest.spyOn(ProfileContext, 'useProfileContext').mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<AppHeader supabaseClient={createMockSupabaseClient()} />);

    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });

  it('renders on Android with null status bar height fallback', async () => {
    appHeaderPlatformOsRef().current = 'android';
    appHeaderStatusBarHeightRef().current = null;
    renderWithProviders(
      <AppHeader supabaseClient={createMockSupabaseClient()} />
    );
    await screen.findByText(getAdopterConfig().branding.displayName);
    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
  });

  it('renders on Android with explicit status bar height', async () => {
    appHeaderPlatformOsRef().current = 'android';
    appHeaderStatusBarHeightRef().current = 32;
    renderWithProviders(
      <AppHeader supabaseClient={createMockSupabaseClient()} />
    );
    await screen.findByText(getAdopterConfig().branding.displayName);
    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
  });

  it('renders on Android when status bar height is zero', async () => {
    appHeaderPlatformOsRef().current = 'android';
    appHeaderStatusBarHeightRef().current = 0;
    renderWithProviders(
      <AppHeader supabaseClient={createMockSupabaseClient()} />
    );
    await screen.findByText(getAdopterConfig().branding.displayName);
    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
  });
});

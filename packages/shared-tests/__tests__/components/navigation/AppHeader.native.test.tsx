import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppHeader } from '@shared/src/components/navigation/AppHeader.native';
import { AuthProvider } from '@shared/src/contexts/AuthContext';
import { ProfileProvider } from '@shared/src/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BRANDING } from '@shared/src/config/branding';

// Mock React Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock Platform
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
    },
    StatusBar: {
      currentHeight: 0,
    },
  };
});

// Mock UserMenu
jest.mock('@shared/src/components/navigation/UserMenu.native', () => ({
  UserMenu: ({ user, profile }: { user: any; profile: any }) => (
    <div data-testid='user-menu'>User Menu</div>
  ),
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
    jest.clearAllMocks();
  });

  it('renders app title', () => {
    renderWithProviders(
      <AppHeader supabaseClient={createMockSupabaseClient()} />
    );
    expect(screen.getByText(BRANDING.displayName)).toBeInTheDocument();
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
    const title = screen.getByText(BRANDING.displayName);
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

  it.skip('renders UserMenu when user is authenticated', async () => {
    const mockClient = createMockSupabaseClient(true);
    mockClient.auth.getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: '1', email: 'test@example.com' },
          access_token: 'token',
        },
      },
      error: null,
    });

    renderWithProviders(<AppHeader supabaseClient={mockClient} />);

    // Wait for UserMenu to appear (ProfileProvider needs to load profile first)
    await screen.findByTestId('user-menu', {}, { timeout: 3000 });

    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });
});

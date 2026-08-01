import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import '@testing-library/jest-dom';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import * as AuthContext from '@beakerstack/shared/contexts/AuthContext';
import * as ProfileContext from '@beakerstack/shared/contexts/ProfileContext';
import type { User } from '@supabase/supabase-js';

// Mock Supabase client
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
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  } as unknown as SupabaseClient;
};

function renderAppHeader(mockClient = createMockSupabaseClient()) {
  return render(
    <BrowserRouter>
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          <AppHeader supabaseClient={mockClient} />
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('AppHeader (Web)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should render app icon and title', () => {
    const mockClient = createMockSupabaseClient();
    render(
      <BrowserRouter>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            <AppHeader supabaseClient={mockClient} />
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(
      screen.getByText(getAdopterConfig().branding.displayName)
    ).toBeInTheDocument();
    const icon = screen.getByAltText(getAdopterConfig().branding.displayName);
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', '/demo-flask-icon.svg');
  });

  it('should show Sign In and Sign Up links when user is not authenticated', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <BrowserRouter>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            <AppHeader supabaseClient={mockClient} />
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for auth to initialize
    await screen.findByText('Sign In');
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('should have correct link to home page', () => {
    const mockClient = createMockSupabaseClient();
    render(
      <BrowserRouter>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            <AppHeader supabaseClient={mockClient} />
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const titleLink = screen
      .getByText(getAdopterConfig().branding.displayName)
      .closest('a');
    expect(titleLink).toHaveAttribute('href', '/');
  });

  it('header is sticky at the top of the viewport', () => {
    renderAppHeader();
    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');
    expect(header.className).toContain('z-50');
  });

  it('adds shadow class after scrolling past threshold', () => {
    renderAppHeader();
    const header = screen.getByRole('banner');
    expect(header.className).not.toContain('shadow-sm');

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(header.className).toContain('shadow-sm');
  });

  it('uses PR preview base path for icon src', () => {
    const originalPath = window.location.pathname;
    window.history.pushState({}, '', '/pr-42/dashboard');
    try {
      renderAppHeader();
      const icon = screen.getByAltText(getAdopterConfig().branding.displayName);
      expect(icon).toHaveAttribute('src', '/pr-42/demo-flask-icon.svg');
    } finally {
      window.history.pushState({}, '', originalPath || '/');
    }
  });

  it('removes shadow class when scrolled back to top', () => {
    renderAppHeader();
    const header = screen.getByRole('banner');

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header.className).toContain('shadow-sm');

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header.className).not.toContain('shadow-sm');
  });

  it('skips scrolled state update when scroll position unchanged', () => {
    renderAppHeader();
    const header = screen.getByRole('banner');

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
    });

    expect(header.className).toContain('shadow-sm');
  });

  it('shows UserMenu when user is authenticated', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
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

    const mockClient = createMockSupabaseClient();
    render(
      <BrowserRouter>
        <AppHeader supabaseClient={mockClient} />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });
});

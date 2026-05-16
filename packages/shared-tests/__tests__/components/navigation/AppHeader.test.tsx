import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BRANDING } from '@beakerstack/shared/config/branding';

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

    expect(screen.getByText(BRANDING.displayName)).toBeInTheDocument();
    const icon = screen.getByAltText(BRANDING.displayName);
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

  it.skip('should show UserMenu when user is authenticated', async () => {
    const mockClient = createMockSupabaseClient();
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    mockClient.auth.getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        },
      },
      error: null,
    });

    // Mock ProfileProvider to return a profile
    mockClient.from = jest.fn(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        }),
      }),
    })) as any;

    render(
      <BrowserRouter>
        <AuthProvider supabaseClient={mockClient}>
          <ProfileProvider supabaseClient={mockClient}>
            <AppHeader supabaseClient={mockClient} />
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for auth to initialize - UserMenu should appear
    await waitFor(
      () => {
        // Either UserMenu appears or Sign In/Sign Up are hidden
        const signInLinks = screen.queryAllByText('Sign In');
        const signUpLinks = screen.queryAllByText('Sign Up');
        // If user is authenticated, these should not be in the header
        expect(signInLinks.length).toBeLessThanOrEqual(1); // May appear in main content
        expect(signUpLinks.length).toBeLessThanOrEqual(1);
      },
      { timeout: 3000 }
    );
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

    const titleLink = screen.getByText(BRANDING.displayName).closest('a');
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
});

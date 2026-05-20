import React from 'react';
import { act, render, screen } from '@testing-library/react';
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

  it('uses PR preview base path for icon src', () => {
    const originalPath = window.location.pathname;
    window.history.pushState({}, '', '/pr-42/dashboard');
    try {
      renderAppHeader();
      const icon = screen.getByAltText(BRANDING.displayName);
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
});

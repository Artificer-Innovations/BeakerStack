import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import * as AuthContext from '@beakerstack/shared/contexts/AuthContext';
import * as ProfileContext from '@beakerstack/shared/contexts/ProfileContext';

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
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  }) as unknown as SupabaseClient;

describe('AppHeader.web — coverage gaps', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('uses PR preview base path when pathname matches', () => {
    window.history.pushState({}, '', '/pr-42/dashboard');

    render(
      <MemoryRouter>
        <AuthProvider supabaseClient={createMockSupabaseClient()}>
          <ProfileProvider supabaseClient={createMockSupabaseClient()}>
            <AppHeader supabaseClient={createMockSupabaseClient()} />
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(
      screen.getByAltText(getAdopterConfig().branding.displayName)
    ).toHaveAttribute('src', '/pr-42/demo-flask-icon.svg');
  });

  it('passes showAdminLink to UserMenu when authenticated', () => {
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

    render(
      <MemoryRouter>
        <AppHeader supabaseClient={createMockSupabaseClient()} showAdminLink />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('User menu')).toBeInTheDocument();
  });
});

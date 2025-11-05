import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { ProtectedRoute } from '@shared/src/components/auth/ProtectedRoute.web';
import { AuthProvider } from '@shared/src/contexts/AuthContext';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    signInWithOAuth: jest.fn(),
  },
} as unknown as SupabaseClient;

describe('ProtectedRoute (Web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when user is authenticated', async () => {
    mockSupabaseClient.auth.getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: '1', email: 'test@example.com' },
          access_token: 'token',
        },
      },
      error: null,
    });

    render(
      <BrowserRouter>
        <AuthProvider supabaseClient={mockSupabaseClient}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should show loading state while checking authentication', () => {
    mockSupabaseClient.auth.getSession = jest.fn().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <AuthProvider supabaseClient={mockSupabaseClient}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', async () => {
    mockSupabaseClient.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider supabaseClient={mockSupabaseClient}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Navigate component should redirect, so protected content shouldn't be visible
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('should use custom redirect path when provided', async () => {
    mockSupabaseClient.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider supabaseClient={mockSupabaseClient}>
          <ProtectedRoute redirectTo="/custom-login">
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('should handle auth state changes', async () => {
    let authStateChangeCallback: (event: string, session: any) => void;
    
    mockSupabaseClient.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabaseClient.auth.onAuthStateChange = jest.fn((callback) => {
      authStateChangeCallback = callback;
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });

    render(
      <BrowserRouter>
        <AuthProvider supabaseClient={mockSupabaseClient}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    );

    // Initially not authenticated
    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    // Simulate user signing in
    if (authStateChangeCallback!) {
      authStateChangeCallback('SIGNED_IN', {
        user: { id: '1', email: 'test@example.com' },
        access_token: 'token',
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});

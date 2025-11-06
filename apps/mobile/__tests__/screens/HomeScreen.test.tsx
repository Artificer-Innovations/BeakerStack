// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
}));

// Mock the supabase client import
jest.mock('../../src/lib/supabase', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn(() => ({
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })),
  }));
  
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

// Mock navigation
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  reset: mockReset,
} as any;

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../src/screens/HomeScreen';
import { AuthProvider } from '@shared/contexts/AuthContext';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('HomeScreen', () => {
  let mockSupabaseClient: Partial<SupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database query
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })),
    }));
    
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: null,
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
    } as any;
  });

  const renderWithAuth = (ui: React.ReactElement, authenticated = false) => {
    if (authenticated) {
      mockSupabaseClient.auth!.getSession = jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
      });
    }
    
    return render(
      <AuthProvider supabaseClient={mockSupabaseClient as SupabaseClient}>
        {ui}
      </AuthProvider>
    );
  };

  it('renders home screen with title and subtitle', () => {
    const { getAllByText, getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );
    
    // Title appears in both header and main content
    const titles = getAllByText('Welcome to Demo App');
    expect(titles.length).toBeGreaterThan(0);
    expect(getByText(/A modern full-stack application/i)).toBeTruthy();
  });

  it('shows sign in button when not authenticated', () => {
    const { getAllByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );
    
    // Sign In appears in both header and main content
    const signInButtons = getAllByText('Sign In');
    expect(signInButtons.length).toBeGreaterThan(0);
  });

  it('shows sign up button when not authenticated', () => {
    const { getAllByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );
    
    // Sign Up appears in both header and main content
    const signUpButtons = getAllByText('Sign Up');
    expect(signUpButtons.length).toBeGreaterThan(0);
  });

  it('shows dashboard link when authenticated', async () => {
    const { getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      true
    );
    
    await waitFor(() => {
      expect(getByText('Go to Dashboard')).toBeTruthy();
    });
  });

  it('shows profile link when authenticated', async () => {
    const { getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      true
    );
    
    await waitFor(() => {
      expect(getByText('View Profile')).toBeTruthy();
    });
  });

  it('shows navigation header with dashboard and profile links when authenticated', async () => {
    const { getAllByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      true
    );
    
    await waitFor(() => {
      const dashboardLinks = getAllByText('Dashboard');
      const profileLinks = getAllByText('Profile');
      expect(dashboardLinks.length).toBeGreaterThan(0);
      expect(profileLinks.length).toBeGreaterThan(0);
    });
  });

  it('shows navigation header with sign in and sign up when not authenticated', () => {
    const { getAllByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );
    
    const signInLinks = getAllByText('Sign In');
    const signUpLinks = getAllByText('Sign Up');
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signUpLinks.length).toBeGreaterThan(0);
  });

  it('has dashboard button that can navigate', async () => {
    const { getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      true
    );
    
    await waitFor(() => {
      const button = getByText('Go to Dashboard');
      expect(button).toBeTruthy();
    });
  });

  it('has profile button that can navigate', async () => {
    const { getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      true
    );
    
    await waitFor(() => {
      const button = getByText('View Profile');
      expect(button).toBeTruthy();
    });
  });

  it('shows test database button', () => {
    const { getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );
    
    expect(getByText(/test database/i)).toBeTruthy();
  });

  it('displays auth context debug information', () => {
    const { getByText } = renderWithAuth(
      <HomeScreen navigation={mockNavigation} />,
      false
    );
    
    expect(getByText('🧪 AuthContext Test')).toBeTruthy();
    expect(getByText(/Loading:/)).toBeTruthy();
    expect(getByText(/User:/)).toBeTruthy();
    expect(getByText(/Session:/)).toBeTruthy();
    expect(getByText(/Error:/)).toBeTruthy();
  });
});


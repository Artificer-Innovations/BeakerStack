import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
import App from '../src/App';
import { HOME_TITLE } from '@shared/utils/strings';

// Mock environment variables to prevent real Supabase client creation
beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
});

// Mock the supabase client
vi.mock('../src/lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(callback => {
      callback('SUBSCRIBED');
      return mockChannel;
    }),
    unsubscribe: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
  };

  return {
    supabase: {
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows returned' },
            }),
          }),
        }),
      })),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
    },
  };
});

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows returned' },
        }),
      }),
    }),
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(callback => {
      callback('SUBSCRIBED');
      return { on: vi.fn().mockReturnThis(), subscribe: vi.fn() };
    }),
  })),
  removeChannel: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
} as any;

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <AuthProvider supabaseClient={mockSupabaseClient}>
        <ProfileProvider supabaseClient={mockSupabaseClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ProfileProvider>
      </AuthProvider>
    );

    // Check if the home page content is rendered
    // Title appears in both header and main content
    const titles = screen.getAllByText(HOME_TITLE);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders navigation links', () => {
    render(
      <AuthProvider supabaseClient={mockSupabaseClient}>
        <ProfileProvider supabaseClient={mockSupabaseClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ProfileProvider>
      </AuthProvider>
    );

    // Check if sign in and sign up links are present
    // These appear in both header and main content
    const signInLinks = screen.getAllByText('Sign In');
    const signUpLinks = screen.getAllByText('Sign Up');
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signUpLinks.length).toBeGreaterThan(0);
  });
});

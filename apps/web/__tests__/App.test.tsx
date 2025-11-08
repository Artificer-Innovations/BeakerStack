import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from '@shared/contexts/AuthContext';
import App from '../src/App';
import { HOME_TITLE } from '@shared/utils/strings';

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
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
} as any;

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <AuthProvider supabaseClient={mockSupabaseClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
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

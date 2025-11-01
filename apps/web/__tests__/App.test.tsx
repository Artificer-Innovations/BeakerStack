import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from '@shared/contexts/AuthContext';
import App from '../src/App';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
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
    expect(screen.getByText('Welcome to Demo App')).toBeInTheDocument();
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
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });
});

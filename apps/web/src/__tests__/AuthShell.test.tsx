import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useHref } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { useProfileContext } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthShell } from '../AuthShell';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }),
} as unknown as SupabaseClient;

vi.mock('../lib/supabase', () => ({ supabase: mockSupabaseClient }));

// Mock App as a leaf component that exercises router and provider contexts
vi.mock('../App', () => ({
  default: function MockApp() {
    const href = useHref('/test');
    const auth = useAuthContext();
    const profile = useProfileContext();
    return (
      <div data-testid='app'>
        <span data-testid='href'>{href}</span>
        <span data-testid='auth-present'>{auth ? 'yes' : 'no'}</span>
        <span data-testid='profile-present'>{profile ? 'yes' : 'no'}</span>
      </div>
    );
  },
}));

describe('AuthShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      mockSupabaseClient.auth.getSession as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      data: { session: null },
    });
    (
      mockSupabaseClient.auth.onAuthStateChange as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('renders children without throwing', async () => {
    await act(async () => {
      render(<AuthShell basePath='/' />);
    });
    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument());
  });

  it('passes basePath to BrowserRouter as basename', async () => {
    await act(async () => {
      render(<AuthShell basePath='/myapp' />);
    });
    await waitFor(() => expect(screen.getByTestId('href')).toBeInTheDocument());
    expect(screen.getByTestId('href').textContent).toBe('/myapp/test');
  });

  it('provides AuthContext and ProfileContext to children', async () => {
    await act(async () => {
      render(<AuthShell basePath='/' />);
    });
    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument());
    // Both contexts are available — confirms AuthProvider → ProfileProvider → BrowserRouter ordering
    expect(screen.getByTestId('auth-present').textContent).toBe('yes');
    expect(screen.getByTestId('profile-present').textContent).toBe('yes');
  });
});

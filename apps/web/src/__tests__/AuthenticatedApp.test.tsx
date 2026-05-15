import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { useProfileContext } from '@beakerstack/shared/contexts/ProfileContext';
import { AuthenticatedApp } from '../AuthenticatedApp';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

const mockSupabaseClient = vi.hoisted(() => ({
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
}));

vi.mock('../lib/supabase', () => ({ supabase: mockSupabaseClient }));

function Leaf() {
  const auth = useAuthContext();
  const profile = useProfileContext();
  return (
    <div data-testid='leaf'>
      <span data-testid='auth-present'>{auth ? 'yes' : 'no'}</span>
      <span data-testid='profile-present'>{profile ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('AuthenticatedApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('renders Outlet children without throwing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Routes>
            <Route element={<AuthenticatedApp />}>
              <Route path='/' element={<div data-testid='child'>ok</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('child')).toBeInTheDocument()
    );
  });

  it('provides AuthContext and ProfileContext to Outlet children', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Routes>
            <Route element={<AuthenticatedApp />}>
              <Route path='/' element={<Leaf />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('leaf')).toBeInTheDocument()
    );
    // Both contexts available — confirms AuthProvider → ProfileProvider ordering
    expect(screen.getByTestId('auth-present').textContent).toBe('yes');
    expect(screen.getByTestId('profile-present').textContent).toBe('yes');
  });
});

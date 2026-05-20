import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { useProfileContext } from '@beakerstack/shared/contexts/ProfileContext';
import AuthenticatedApp from '../AuthenticatedApp';

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

vi.mock('../components/ObservabilityUserSync', () => ({
  ObservabilityUserSync: () => null,
}));

function Probe() {
  const auth = useAuthContext();
  const profile = useProfileContext();
  return (
    <div data-testid='probe'>
      <span data-testid='auth-present'>{auth ? 'yes' : 'no'}</span>
      <span data-testid='profile-present'>{profile ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('AuthenticatedApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('provides AuthContext and ProfileContext to nested routes', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/probe']}>
          <Routes>
            <Route element={<AuthenticatedApp />}>
              <Route path='/probe' element={<Probe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('probe')).toBeInTheDocument()
    );
    expect(screen.getByTestId('auth-present').textContent).toBe('yes');
    expect(screen.getByTestId('profile-present').textContent).toBe('yes');
  });
});

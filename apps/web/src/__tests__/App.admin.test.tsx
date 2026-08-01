import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import App from '../App';

beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
});

vi.mock('@beakerstack/admin/web', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@beakerstack/admin/web')>();
  return {
    ...actual,
    AdminRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

vi.mock('../admin/AdminApp', () => ({
  default: () => <p>Admin area</p>,
}));

vi.mock('../components/ObservabilityUserSync', () => ({
  ObservabilityUserSync: () => null,
}));

const adminUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
};

const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: adminUser } },
      error: null,
    }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  from: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: (s: string) => void) => {
      cb('SUBSCRIBED');
      return {
        unsubscribe: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
      };
    }),
  })),
  removeChannel: vi.fn(),
} as never;

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <AuthProvider supabaseClient={mockSupabaseClient}>
        <ProfileProvider supabaseClient={mockSupabaseClient}>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('App admin routes', () => {
  it('renders admin area when navigating to /admin', async () => {
    await act(async () => {
      renderAt('/admin');
    });
    await waitFor(() =>
      expect(screen.getByText('Admin area')).toBeInTheDocument()
    );
  });
});

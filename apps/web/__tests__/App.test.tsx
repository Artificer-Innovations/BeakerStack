import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import App from '../src/App';

// Mock environment variables to prevent real Supabase client creation
beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
});

// Mock lazy-loaded HomePage so Suspense resolves synchronously in tests
vi.mock('../src/pages/HomePage', () => ({
  default: () => (
    <div>
      <a href='/login'>Sign in</a>
      <a href='/signup'>Get started</a>
    </div>
  ),
}));

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

function renderApp() {
  return render(
    <ThemeProvider>
      <AuthProvider supabaseClient={mockSupabaseClient}>
        <ProfileProvider supabaseClient={mockSupabaseClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('App', () => {
  it('renders without crashing', async () => {
    // act(async) flushes React.lazy's dynamic-import Promise and all
    // subsequent React state updates before we query the DOM.
    await act(async () => {
      renderApp();
    });

    const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
  });

  it('renders navigation links', async () => {
    await act(async () => {
      renderApp();
    });

    const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
    const signUpLinks = screen.getAllByRole('link', { name: /get started/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signUpLinks.length).toBeGreaterThan(0);
  });
});

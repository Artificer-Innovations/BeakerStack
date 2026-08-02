import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import App from '../App';

beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
});

const billingUser = vi.hoisted(() => ({
  id: 'billing-user-id',
  email: 'billing@example.com',
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: billingUser } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
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
  },
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    BillingProvider: ({ children }: { children: ReactNode }) => (
      <div data-testid='billing-provider'>{children}</div>
    ),
  };
});

vi.mock('../pages/billing/BillingOverviewPage', () => ({
  default: () => <h1>Billing overview</h1>,
}));

vi.mock('../components/ObservabilityUserSync', () => ({
  ObservabilityUserSync: () => null,
}));

describe('App billing route', () => {
  it('loads BillingProviderLayout when visiting /billing', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/billing']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Billing overview')).toBeInTheDocument();
    });
    expect(screen.getByTestId('billing-provider')).toBeInTheDocument();
  });
});

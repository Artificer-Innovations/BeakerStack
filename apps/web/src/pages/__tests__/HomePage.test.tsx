import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../HomePage';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(cb => { cb('SUBSCRIBED'); return {}; }),
    }),
    removeChannel: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
  },
}));

// Stub the landing config so tests don't depend on placehold.co or Lucide icons
vi.mock('../../config/landing', () => ({
  landingConfig: {
    brand: { name: 'BeakerStack', tagline: 'Test tagline' },
    nav: { links: [], signInHref: '/login', signUpHref: '/signup' },
    hero: {
      headline: 'Build the full stack. Not the scaffolding.',
      subhead: 'Test subhead',
      primaryCta: { label: 'Get started free', href: '/signup' },
      mediaSrc: 'https://placehold.co/600x338',
      mediaAlt: 'Hero image',
    },
    featureGrid: { heading: 'Features', subhead: '', items: [] },
    featureRows: [],
    pricing: { heading: 'Pricing', subhead: '' },
    faq: { heading: 'FAQ', items: [] },
    finalCta: { headline: 'Ready?', subhead: '', ctaLabel: 'Start', ctaHref: '/signup' },
  },
}));

vi.mock('../../../billing/beakerstackBillingConfig', () => ({
  beakerstackBillingConfig: { plans: [] },
}));

describe('HomePage', () => {
  let mockSupabaseClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient = {
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
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(cb => { cb('SUBSCRIBED'); return {}; }),
      }),
      removeChannel: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
    } as unknown as SupabaseClient;
  });

  const renderWithAuth = async (authenticated = false) => {
    if (authenticated) {
      (mockSupabaseClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          session: { user: { id: 'test-user-id', email: 'test@example.com' } },
        },
      });
    }

    let result: ReturnType<typeof render> | null = null;
    await act(async () => {
      result = render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider supabaseClient={mockSupabaseClient}>
            <ProfileProvider supabaseClient={mockSupabaseClient}>
              <Routes>
                <Route path='/' element={<HomePage />} />
                <Route path='/dashboard' element={<div>Dashboard</div>} />
              </Routes>
            </ProfileProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    return result!;
  };

  describe('when user is not authenticated', () => {
    it('renders the landing page hero headline', async () => {
      await renderWithAuth(false);
      expect(
        screen.getByText('Build the full stack. Not the scaffolding.')
      ).toBeInTheDocument();
    });

    it('renders a Get started CTA link pointing to /signup', async () => {
      await renderWithAuth(false);
      const ctaLinks = screen.getAllByRole('link', { name: /get started/i });
      expect(ctaLinks.length).toBeGreaterThan(0);
      expect(ctaLinks[0]).toHaveAttribute('href', '/signup');
    });

    it('renders a Sign in link pointing to /login', async () => {
      await renderWithAuth(false);
      const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
      expect(signInLinks.length).toBeGreaterThan(0);
      expect(signInLinks[0]).toHaveAttribute('href', '/login');
    });
  });

  describe('when user is authenticated', () => {
    it('redirects to /dashboard', async () => {
      await renderWithAuth(true);
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
  });
});

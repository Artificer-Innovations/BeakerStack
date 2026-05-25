import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../HomePage';
import type { ReactNode } from 'react';

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
      subscribe: vi.fn(cb => {
        cb('SUBSCRIBED');
        return { unsubscribe: vi.fn().mockResolvedValue(undefined) };
      }),
    }),
    removeChannel: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
  },
}));

vi.mock('@beakerstack/waitlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/waitlist')>();
  return {
    ...actual,
    useSignupMode: () => ({
      mode: 'open' as const,
      settings: null,
      loading: false,
      isOpen: true,
      isWaitlist: false,
      isInviteOnly: false,
      isClosed: false,
    }),
  };
});

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    BillingProvider: ({ children }: { children: ReactNode }) => children,
    usePlanCatalog: () => ({
      plans: [],
      loading: false,
      error: null,
      refresh: async () => {},
    }),
  };
});

vi.mock('@adopter/config/landing', () => ({
  landingConfig: {
    brand: { name: 'Beaker Stack', tagline: 'Test tagline' },
    nav: { links: [], signInHref: '/login', signUpHref: '/signup' },
    hero: {
      headline: 'Build the full stack. Not the scaffolding.',
      subhead: 'Test subhead',
      primaryCta: { label: 'Get started free', href: '/signup' },
      mediaSrc: 'https://placehold.co/600x338',
      mediaAlt: 'Hero image',
    },
    featureGrid: { heading: 'Features', subhead: '', items: [] },
    featureRows: [
      {
        title: 'Test feature',
        body: 'Test feature body.',
        mediaSrc: 'https://placehold.co/600x338',
        mediaAlt: 'Test feature image',
        mediaSide: 'right',
        ctaHref: '/signup',
        ctaLabel: 'Learn more',
      },
    ],
    pricing: { heading: 'Pricing', subhead: '' },
    faq: { heading: 'FAQ', items: [] },
    finalCta: {
      headline: 'Ready?',
      subhead: '',
      ctaLabel: 'Start',
      ctaHref: '/signup',
    },
  },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
});

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderHome = async () => {
    let result: ReturnType<typeof render> | null = null;
    await act(async () => {
      result = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path='/' element={<HomePage />} />
          </Routes>
        </MemoryRouter>
      );
    });
    await waitFor(() =>
      expect(
        screen.getByText('Build the full stack. Not the scaffolding.')
      ).toBeInTheDocument()
    );
    if (result === null) {
      throw new Error('Expected render to assign result');
    }
    return result;
  };

  it('renders the landing page hero headline', async () => {
    await renderHome();
    expect(
      screen.getByText('Build the full stack. Not the scaffolding.')
    ).toBeInTheDocument();
  });

  it('renders a Get started CTA link pointing to /signup', async () => {
    await renderHome();
    const ctaLinks = screen.getAllByRole('link', { name: /get started/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute('href', '/signup');
  });

  it('renders a Sign in link pointing to /login', async () => {
    await renderHome();
    const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0]).toHaveAttribute('href', '/login');
  });
});

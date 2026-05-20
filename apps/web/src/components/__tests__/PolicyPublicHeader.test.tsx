import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PolicyPublicHeader } from '../PolicyPublicHeader';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');

function renderHeader() {
  return render(
    <MemoryRouter>
      <PolicyPublicHeader />
    </MemoryRouter>
  );
}

describe('PolicyPublicHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows Sign in and Get started when no session hint', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      '/signup'
    );
  });

  it('shows Go to dashboard when session hint is present', () => {
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({ access_token: 'jwt', refresh_token: 'r' })
    );
    renderHeader();
    expect(
      screen.getByRole('link', { name: 'Go to dashboard' })
    ).toHaveAttribute('href', '/dashboard');
    expect(
      screen.queryByRole('link', { name: 'Sign in' })
    ).not.toBeInTheDocument();
  });

  it('renders Features, Pricing, and FAQ nav links with absolute anchors', () => {
    renderHeader();
    const mainNav = screen.getByRole('navigation', { name: 'Main' });
    const links = mainNav.querySelectorAll('a');
    const hrefs = Array.from(links).map(a => a.getAttribute('href'));
    expect(hrefs).toContain('/#features');
    expect(hrefs).toContain('/#pricing');
    expect(hrefs).toContain('/#faq');
  });

  it('header is sticky and gains shadow class after scrolling past threshold', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    expect(header.className).not.toContain('shadow-sm');

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(header.className).toContain('shadow-sm');
  });

  it('opens mobile menu showing nav links and Sign in', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile' });
    expect(mobileNav).toHaveTextContent('Features');
    expect(mobileNav).toHaveTextContent('Pricing');
    expect(mobileNav).toHaveTextContent('FAQ');
    expect(mobileNav).toHaveTextContent('Sign in');
  });

  it('leaves non-hash nav hrefs untouched when prefixing base path', async () => {
    const landingMod = await import('../../config/landing');
    const original = landingMod.landingConfig.nav.links;
    // Inject a non-hash link entry to exercise the alternate branch.
    landingMod.landingConfig.nav.links = [
      ...original,
      { label: 'Docs', href: '/docs' },
    ];
    try {
      renderHeader();
      const mainNav = screen.getByRole('navigation', { name: 'Main' });
      const docsLink = within(mainNav).getByRole('link', { name: 'Docs' });
      expect(docsLink).toHaveAttribute('href', '/docs');
    } finally {
      landingMod.landingConfig.nav.links = original;
    }
  });
});

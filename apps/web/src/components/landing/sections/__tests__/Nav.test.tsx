import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { branding } from '@adopter/config/branding';
import { Nav } from '../Nav';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');

const config = {
  brand: {
    name: branding.displayName,
    tagline: 'Ship your SaaS faster.',
    logoSrc: '/logo.svg',
  },
  links: [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
  ],
  signInHref: '/signin',
  signUpHref: '/signup',
};

function renderNav() {
  return render(
    <MemoryRouter>
      <Nav config={config} />
    </MemoryRouter>
  );
}

describe('Nav', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('prefixes default logo path with PR preview base when pathname matches', () => {
    const originalPath = window.location.pathname;
    const configNoLogo = {
      ...config,
      brand: {
        name: branding.displayName,
        tagline: 'Ship your SaaS faster.',
      },
    };
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        pathname: '/pr-42/dashboard',
      },
    });
    render(
      <MemoryRouter>
        <Nav config={configNoLogo} />
      </MemoryRouter>
    );
    const brandLink = screen.getByRole('link', { name: branding.displayName });
    const img = brandLink.querySelector('img');
    if (!img) {
      throw new Error('expected brand logo img');
    }
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('src')).toBe('/pr-42/demo-flask-icon.svg');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, pathname: originalPath },
    });
  });

  it('renders the brand name', () => {
    renderNav();
    expect(screen.getByText(branding.displayName)).toBeInTheDocument();
  });

  it('renders desktop navigation links', () => {
    renderNav();
    expect(
      screen.getByRole('navigation', { name: 'Main' })
    ).toBeInTheDocument();
    const mainNav = screen.getByRole('navigation', { name: 'Main' });
    expect(mainNav).toHaveTextContent('Features');
    expect(mainNav).toHaveTextContent('Pricing');
    expect(mainNav).toHaveTextContent('Articles');
    expect(mainNav).toHaveTextContent('Help');
  });

  it('does not duplicate Help when landing config already includes it', () => {
    render(
      <MemoryRouter>
        <Nav
          config={{
            ...config,
            links: [...config.links, { href: '/help', label: 'Help' }],
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('link', { name: 'Help' })).toHaveLength(1);
  });

  it('renders Help as a client route link', () => {
    renderNav();
    const helpLink = screen.getByRole('link', { name: 'Help' });
    expect(helpLink).toHaveAttribute('href', '/help');
  });

  it('renders Articles as a client route link', () => {
    renderNav();
    const articlesLink = screen.getByRole('link', { name: 'Articles' });
    expect(articlesLink).toHaveAttribute('href', '/articles');
  });

  it('does not duplicate Articles when landing config already includes it', () => {
    render(
      <MemoryRouter>
        <Nav
          config={{
            ...config,
            links: [...config.links, { href: '/articles', label: 'Articles' }],
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('link', { name: 'Articles' })).toHaveLength(1);
  });

  it('renders Sign in and Get started buttons', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Get started' })
    ).toBeInTheDocument();
  });

  it('mobile menu toggle starts with aria-expanded false', () => {
    renderNav();
    const toggle = screen.getByRole('button', { name: 'Toggle menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking toggle opens mobile menu', () => {
    renderNav();
    const toggle = screen.getByRole('button', { name: 'Toggle menu' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('navigation', { name: 'Mobile' })
    ).toBeInTheDocument();
  });

  it('shows Go to dashboard when localStorage session hint is present', () => {
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({ access_token: 'jwt-token', refresh_token: 'r' })
    );
    renderNav();
    const dash = screen.getByRole('link', { name: 'Go to dashboard' });
    expect(dash).toHaveAttribute('href', '/dashboard');
    expect(
      screen.queryByRole('link', { name: 'Sign in' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Get started' })
    ).not.toBeInTheDocument();
  });

  it('mobile menu shows Go to dashboard when session hint is present', () => {
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({ access_token: 'jwt-token', refresh_token: 'r' })
    );
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile' });
    expect(mobileNav).toHaveTextContent('Features');
    expect(mobileNav).toHaveTextContent('Pricing');
    expect(mobileNav).toHaveTextContent('Go to dashboard');
  });

  it('mobile menu shows nav links and sign in when no session hint', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile' });
    expect(mobileNav).toHaveTextContent('Features');
    expect(mobileNav).toHaveTextContent('Pricing');
    expect(mobileNav).toHaveTextContent('Sign in');
  });

  it('clicking a mobile nav link closes the menu', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile' });
    fireEvent.click(within(mobileNav).getByRole('link', { name: 'Features' }));
    expect(
      screen.queryByRole('navigation', { name: 'Mobile' })
    ).not.toBeInTheDocument();
  });

  it('adds shadow class after scrolling past threshold', () => {
    renderNav();
    const header = screen.getByRole('banner');
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

  it('clicking mobile "Go to dashboard" link closes the menu', () => {
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({ access_token: 'jwt-token', refresh_token: 'r' })
    );
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile' });
    fireEvent.click(
      within(mobileNav).getByRole('link', { name: 'Go to dashboard' })
    );
    expect(
      screen.queryByRole('navigation', { name: 'Mobile' })
    ).not.toBeInTheDocument();
  });

  it('clicking mobile "Sign in" link closes the menu', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile' });
    fireEvent.click(within(mobileNav).getByRole('link', { name: 'Sign in' }));
    expect(
      screen.queryByRole('navigation', { name: 'Mobile' })
    ).not.toBeInTheDocument();
  });

  it('removes shadow class when scrolled back to top', () => {
    renderNav();
    const header = screen.getByRole('banner');

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header.className).toContain('shadow-sm');

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header.className).not.toContain('shadow-sm');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Nav } from '../Nav';

const baseConfig = {
  links: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
  ],
  signInHref: '/login',
  signUpHref: '/signup',
  brand: { name: 'TestStack', logoSrc: undefined as string | undefined },
};

function renderNav(overrides?: Partial<typeof baseConfig>) {
  return render(
    <MemoryRouter>
      <Nav config={{ ...baseConfig, ...overrides }} />
    </MemoryRouter>
  );
}

describe('Nav', () => {
  it('renders brand name', () => {
    renderNav();
    expect(screen.getByText('TestStack')).toBeInTheDocument();
  });

  it('renders desktop nav links', () => {
    renderNav();
    expect(screen.getAllByRole('link', { name: /features/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /pricing/i }).length).toBeGreaterThan(0);
  });

  it('renders Sign in and Get started links', () => {
    renderNav();
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
  });

  it('uses default logo src when logoSrc is not provided', () => {
    renderNav();
    const logo = screen.getByRole('img', { name: /teststack/i });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src');
  });

  it('uses provided logoSrc when given', () => {
    renderNav({ brand: { name: 'TestStack', logoSrc: '/custom-logo.svg' } });
    const logo = screen.getByRole('img', { name: /teststack/i });
    expect(logo).toHaveAttribute('src', '/custom-logo.svg');
  });

  it('mobile menu is closed by default', () => {
    renderNav();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();
  });

  it('opens mobile menu on toggle button click', () => {
    renderNav();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: /mobile/i })).toBeInTheDocument();
  });

  it('closes mobile menu on second toggle click', () => {
    renderNav();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();
  });

  it('mobile menu shows nav links and sign in', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    const mobileNav = screen.getByRole('navigation', { name: /mobile/i });
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav.querySelectorAll('a').length).toBeGreaterThan(0);
  });

  it('closes mobile menu when a mobile link is clicked', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    const mobileNav = screen.getByRole('navigation', { name: /mobile/i });
    const links = mobileNav.querySelectorAll('a');
    fireEvent.click(links[0]);
    expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();
  });

  it('adds shadow class to header when scrolled', () => {
    renderNav();
    const header = screen.getByRole('banner');
    expect(header.className).not.toContain('shadow-sm');
    Object.defineProperty(window, 'scrollY', { value: 20, configurable: true });
    fireEvent.scroll(window);
    expect(header.className).toContain('shadow-sm');
  });

  it('removes shadow class when scrolled back to top', () => {
    renderNav();
    Object.defineProperty(window, 'scrollY', { value: 20, configurable: true });
    fireEvent.scroll(window);
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    fireEvent.scroll(window);
    expect(screen.getByRole('banner').className).not.toContain('shadow-sm');
  });
});

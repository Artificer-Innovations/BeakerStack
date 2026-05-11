import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Nav } from '../Nav';

const config = {
  brand: { name: 'TestApp', tagline: 'tagline' },
  links: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
  ],
  signInHref: '/login',
  signUpHref: '/signup',
};

function renderNav(overrides = {}) {
  return render(
    <MemoryRouter>
      <Nav config={{ ...config, ...overrides }} />
    </MemoryRouter>
  );
}

describe('Nav', () => {
  it('renders the brand name', () => {
    renderNav();
    expect(screen.getByText('TestApp')).toBeInTheDocument();
  });

  it('renders nav links with correct hrefs', () => {
    renderNav();
    const featuresLink = screen.getByRole('link', { name: 'Features' });
    expect(featuresLink).toHaveAttribute('href', '#features');
    const pricingLink = screen.getByRole('link', { name: 'Pricing' });
    expect(pricingLink).toHaveAttribute('href', '#pricing');
  });

  it('renders sign in link pointing to signInHref', () => {
    renderNav();
    const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    signInLinks.forEach(l => expect(l).toHaveAttribute('href', '/login'));
  });

  it('renders get started link pointing to signUpHref', () => {
    renderNav();
    const link = screen.getByRole('link', { name: /get started/i });
    expect(link).toHaveAttribute('href', '/signup');
  });

  it('renders the hamburger toggle button', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
  });

  it('mobile nav is hidden by default', () => {
    renderNav();
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument();
  });

  it('mobile nav appears after hamburger click', async () => {
    renderNav();
    const btn = screen.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(btn);
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument();
  });

  it('mobile nav disappears after second hamburger click', async () => {
    renderNav();
    const btn = screen.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument();
  });

  it('uses logoSrc from brand config when provided', () => {
    renderNav({ brand: { name: 'TestApp', tagline: 't', logoSrc: '/custom-logo.svg' } });
    const img = screen.getByRole('img', { name: 'TestApp' });
    expect(img).toHaveAttribute('src', '/custom-logo.svg');
  });

  it('falls back to default logo path when logoSrc is absent', () => {
    renderNav();
    const img = screen.getByRole('img', { name: 'TestApp' });
    expect(img.getAttribute('src')).toContain('flask-icon');
  });
});

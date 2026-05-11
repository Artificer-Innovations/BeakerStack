import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Nav } from '../Nav';

const config = {
  brand: { name: 'BeakerStack', tagline: 'Ship your SaaS faster.', logoSrc: '/logo.svg' },
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
  it('renders the brand name', () => {
    renderNav();
    expect(screen.getByText('BeakerStack')).toBeInTheDocument();
  });

  it('renders desktop navigation links', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    const mainNav = screen.getByRole('navigation', { name: 'Main' });
    expect(mainNav).toHaveTextContent('Features');
    expect(mainNav).toHaveTextContent('Pricing');
  });

  it('renders Sign in and Get started buttons', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get started' })).toBeInTheDocument();
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
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument();
  });

  it('mobile menu shows nav links and sign in', () => {
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
    const featuresLink = mobileNav.querySelector('a[href="#features"]')!;
    fireEvent.click(featuresLink);
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument();
  });

  it('adds shadow class after scrolling past threshold', () => {
    const { container } = renderNav();
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('shadow-sm');

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(header.className).toContain('shadow-sm');
  });

  it('removes shadow class when scrolled back to top', () => {
    const { container } = renderNav();
    const header = container.querySelector('header')!;

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header.className).toContain('shadow-sm');

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header.className).not.toContain('shadow-sm');
  });
});

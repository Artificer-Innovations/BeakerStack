import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { AppFooter } from '../AppFooter';

function renderFooter() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AppFooter />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('AppFooter', () => {
  it('renders all policy and help links', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute(
      'href',
      '/help'
    );
    expect(
      screen.getByRole('link', { name: 'Terms of Service' })
    ).toHaveAttribute('href', '/terms');
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' })
    ).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Refund Policy' })).toHaveAttribute(
      'href',
      '/refunds'
    );
  });

  it('renders product name link to site root', () => {
    renderFooter();
    expect(
      screen.getByRole('link', {
        name: getAdopterConfig().branding.displayName,
      })
    ).toHaveAttribute('href', '/');
  });

  it('renders copyright text', () => {
    renderFooter();
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(String(year)))).toBeInTheDocument();
  });

  it('has a legal nav landmark', () => {
    renderFooter();
    expect(
      screen.getByRole('navigation', { name: 'Legal' })
    ).toBeInTheDocument();
  });
});

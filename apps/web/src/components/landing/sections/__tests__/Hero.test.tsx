import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Hero } from '../Hero';

const base = {
  headline: 'Build something great.',
  subhead: 'The subhead text.',
  primaryCta: { label: 'Get started', href: '/signup' },
  mediaSrc: 'https://example.com/img.png',
  mediaAlt: 'Product screenshot',
};

function renderHero(overrides = {}) {
  return render(
    <MemoryRouter>
      <Hero config={{ ...base, ...overrides }} />
    </MemoryRouter>
  );
}

describe('Hero', () => {
  it('renders the headline', () => {
    renderHero();
    expect(screen.getByRole('heading', { level: 1, name: /build something great/i })).toBeInTheDocument();
  });

  it('renders the subhead', () => {
    renderHero();
    expect(screen.getByText('The subhead text.')).toBeInTheDocument();
  });

  it('renders the primary CTA with correct href', () => {
    renderHero();
    const link = screen.getByRole('link', { name: 'Get started' });
    expect(link).toHaveAttribute('href', '/signup');
  });

  it('renders the hero image with correct alt text', () => {
    renderHero();
    expect(screen.getByRole('img', { name: 'Product screenshot' })).toBeInTheDocument();
  });

  it('renders eyebrow when provided', () => {
    renderHero({ eyebrow: 'Open source' });
    expect(screen.getByText('Open source')).toBeInTheDocument();
  });

  it('does not render eyebrow when absent', () => {
    renderHero();
    expect(screen.queryByText('Open source')).not.toBeInTheDocument();
  });

  it('renders secondary CTA when provided', () => {
    renderHero({ secondaryCta: { label: 'See features', href: '#features' } });
    expect(screen.getByRole('link', { name: 'See features' })).toHaveAttribute('href', '#features');
  });

  it('does not render secondary CTA when absent', () => {
    renderHero();
    expect(screen.queryByRole('link', { name: 'See features' })).not.toBeInTheDocument();
  });

  it('renders trust strip when provided', () => {
    renderHero({ trustStrip: 'Built on React and Supabase.' });
    expect(screen.getByText('Built on React and Supabase.')).toBeInTheDocument();
  });

  it('does not render trust strip when absent', () => {
    renderHero();
    expect(screen.queryByText(/built on/i)).not.toBeInTheDocument();
  });
});

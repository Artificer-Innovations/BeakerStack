import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Hero } from '../Hero';

const baseConfig = {
  headline: 'Build the full stack. Not the scaffolding.',
  subhead: 'BeakerStack ships with everything a SaaS needs.',
  primaryCta: { label: 'Get started free', href: '/signup' },
  mediaSrc: 'https://placehold.co/600x338?text=Dashboard',
  mediaAlt: 'Dashboard preview',
};

describe('Hero', () => {
  it('renders the headline and subhead', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Build the full stack. Not the scaffolding.' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('BeakerStack ships with everything a SaaS needs.')
    ).toBeInTheDocument();
  });

  it('renders the primary CTA link', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Get started free' })).toBeInTheDocument();
  });

  it('renders the hero image with eager loading', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    const img = screen.getByRole('img', { name: 'Dashboard preview' });
    expect(img).toHaveAttribute('src', 'https://placehold.co/600x338?text=Dashboard');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('renders eyebrow text when provided', () => {
    render(
      <MemoryRouter>
        <Hero config={{ ...baseConfig, eyebrow: 'Open source SaaS template' }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Open source SaaS template')).toBeInTheDocument();
  });

  it('does not render eyebrow when absent', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Open source SaaS template')).not.toBeInTheDocument();
  });

  it('renders secondary CTA when provided', () => {
    render(
      <MemoryRouter>
        <Hero
          config={{
            ...baseConfig,
            secondaryCta: { label: 'View on GitHub', href: 'https://github.com/Artificer-Innovations/BeakerStack' },
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'View on GitHub' })).toBeInTheDocument();
  });

  it('does not render secondary CTA when absent', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('renders trust strip when provided', () => {
    render(
      <MemoryRouter>
        <Hero config={{ ...baseConfig, trustStrip: 'MIT licensed · No vendor lock-in' }} />
      </MemoryRouter>
    );
    expect(screen.getByText('MIT licensed · No vendor lock-in')).toBeInTheDocument();
  });

  it('does not render trust strip when absent', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/MIT licensed/)).not.toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinalCTA } from '../FinalCTA';

const baseConfig = {
  headline: 'Ready to ship faster?',
  subhead: 'Start building your SaaS today.',
  ctaLabel: 'Get started free',
  ctaHref: '/signup',
};

describe('FinalCTA', () => {
  it('renders headline and subhead', () => {
    render(
      <MemoryRouter>
        <FinalCTA config={baseConfig} />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Ready to ship faster?' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start building your SaaS today.')
    ).toBeInTheDocument();
  });

  it('renders the primary CTA link', () => {
    render(
      <MemoryRouter>
        <FinalCTA config={baseConfig} />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: 'Get started free' })
    ).toBeInTheDocument();
  });

  it('renders secondary CTA with target="_blank" and rel="noopener noreferrer"', () => {
    const config = {
      ...baseConfig,
      secondaryCta: {
        label: 'View on GitHub',
        href: 'https://github.com/Artificer-Innovations/BeakerStack',
      },
    };
    render(
      <MemoryRouter>
        <FinalCTA config={config} />
      </MemoryRouter>
    );
    const secondary = screen.getByRole('link', { name: 'View on GitHub' });
    expect(secondary).toHaveAttribute(
      'href',
      'https://github.com/Artificer-Innovations/BeakerStack'
    );
    expect(secondary).toHaveAttribute('target', '_blank');
    expect(secondary).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render secondary CTA when absent', () => {
    render(
      <MemoryRouter>
        <FinalCTA config={baseConfig} />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});

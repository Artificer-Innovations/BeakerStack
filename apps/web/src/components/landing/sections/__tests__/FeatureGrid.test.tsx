import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureGrid } from '../FeatureGrid';
import type { LucideIcon } from 'lucide-react';

const MockIcon = vi.fn(() => <svg data-testid='mock-icon' />);

const baseConfig = {
  heading: 'Features',
  subhead: 'Everything you need.',
  items: [
    {
      icon: MockIcon as unknown as LucideIcon,
      title: 'Authentication',
      body: 'Built-in auth with Supabase.',
    },
    {
      icon: MockIcon as unknown as LucideIcon,
      title: 'Open source',
      body: 'MIT licensed.',
      ctaLabel: 'View on GitHub',
      ctaHref: 'https://github.com/Artificer-Innovations/BeakerStack',
    },
    {
      icon: MockIcon as unknown as LucideIcon,
      title: 'Internal link',
      body: 'Relative CTA.',
      ctaLabel: 'See docs',
      ctaHref: '/docs',
    },
  ],
};

describe('FeatureGrid', () => {
  it('renders section heading and subhead', () => {
    render(<FeatureGrid config={baseConfig} />);
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Everything you need.')).toBeInTheDocument();
  });

  it('renders all item titles and bodies', () => {
    render(<FeatureGrid config={baseConfig} />);
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Built-in auth with Supabase.')).toBeInTheDocument();
    expect(screen.getByText('Open source')).toBeInTheDocument();
    expect(screen.getByText('MIT licensed.')).toBeInTheDocument();
  });

  it('renders item icons', () => {
    render(<FeatureGrid config={baseConfig} />);
    expect(screen.getAllByTestId('mock-icon').length).toBe(3);
  });

  it('renders CTA link for items that have ctaLabel and ctaHref', () => {
    render(<FeatureGrid config={baseConfig} />);
    expect(screen.getByRole('link', { name: /view on github/i })).toBeInTheDocument();
  });

  it('does not render CTA link for items without ctaLabel/ctaHref', () => {
    render(<FeatureGrid config={baseConfig} />);
    expect(screen.queryByRole('link', { name: /authentication/i })).not.toBeInTheDocument();
  });

  it('adds target="_blank" rel="noopener noreferrer" on external CTA links', () => {
    render(<FeatureGrid config={baseConfig} />);
    const githubLink = screen.getByRole('link', { name: /view on github/i });
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not add target/rel on internal CTA links', () => {
    render(<FeatureGrid config={baseConfig} />);
    const internalLink = screen.getByRole('link', { name: /see docs/i });
    expect(internalLink).not.toHaveAttribute('target');
    expect(internalLink).not.toHaveAttribute('rel');
  });

  it('renders empty grid when items array is empty', () => {
    render(<FeatureGrid config={{ ...baseConfig, items: [] }} />);
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.queryAllByRole('link').length).toBe(0);
  });
});

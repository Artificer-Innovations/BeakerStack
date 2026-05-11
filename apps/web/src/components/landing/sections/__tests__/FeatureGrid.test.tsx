import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureGrid } from '../FeatureGrid';

const MockIcon = () => <svg data-testid='mock-icon' />;

const base = {
  heading: 'Everything wired.',
  subhead: 'No hidden parts.',
  items: [
    { icon: MockIcon, title: 'Auth', body: 'Auth out of the box.' },
    { icon: MockIcon, title: 'Billing', body: 'Billing that works.' },
  ],
};

describe('FeatureGrid', () => {
  it('renders heading and subhead', () => {
    render(<FeatureGrid config={base} />);
    expect(screen.getByRole('heading', { name: 'Everything wired.' })).toBeInTheDocument();
    expect(screen.getByText('No hidden parts.')).toBeInTheDocument();
  });

  it('renders all items with title and body', () => {
    render(<FeatureGrid config={base} />);
    expect(screen.getByText('Auth')).toBeInTheDocument();
    expect(screen.getByText('Auth out of the box.')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Billing that works.')).toBeInTheDocument();
  });

  it('renders per-item CTA when both ctaLabel and ctaHref are provided', () => {
    const config = {
      ...base,
      items: [
        {
          icon: MockIcon,
          title: 'OSS',
          body: 'Free.',
          ctaLabel: 'View on GitHub',
          ctaHref: 'https://github.com/example',
        },
      ],
    };
    render(<FeatureGrid config={config} />);
    const link = screen.getByRole('link', { name: /view on github/i });
    expect(link).toHaveAttribute('href', 'https://github.com/example');
  });

  it('adds target=_blank and rel=noopener for external CTA hrefs', () => {
    const config = {
      ...base,
      items: [
        {
          icon: MockIcon,
          title: 'OSS',
          body: 'Free.',
          ctaLabel: 'GitHub',
          ctaHref: 'https://github.com/example',
        },
      ],
    };
    render(<FeatureGrid config={config} />);
    const link = screen.getByRole('link', { name: /github/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not add target=_blank for internal CTA hrefs', () => {
    const config = {
      ...base,
      items: [
        {
          icon: MockIcon,
          title: 'Features',
          body: 'See them.',
          ctaLabel: 'See features',
          ctaHref: '#features',
        },
      ],
    };
    render(<FeatureGrid config={config} />);
    const link = screen.getByRole('link', { name: /see features/i });
    expect(link).not.toHaveAttribute('target');
  });

  it('does not render CTA when only ctaLabel is set', () => {
    const config = {
      ...base,
      items: [{ icon: MockIcon, title: 'X', body: 'Y', ctaLabel: 'Click' }],
    };
    render(<FeatureGrid config={config} />);
    expect(screen.queryByRole('link', { name: 'Click' })).not.toBeInTheDocument();
  });

  it('renders empty grid without error', () => {
    render(<FeatureGrid config={{ ...base, items: [] }} />);
    expect(screen.getByRole('heading', { name: 'Everything wired.' })).toBeInTheDocument();
  });
});

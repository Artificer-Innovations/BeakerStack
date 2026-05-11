import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureGrid } from '../FeatureGrid';

const TestIcon = () => <svg data-testid='icon' />;

const config = {
  heading: 'Everything you need',
  subhead: 'A complete toolkit for modern SaaS.',
  items: [
    { icon: TestIcon, title: 'Auth', body: 'Secure authentication out of the box.' },
    {
      icon: TestIcon,
      title: 'Billing',
      body: 'Stripe-powered subscriptions.',
      ctaLabel: 'Learn more',
      ctaHref: '#billing',
    },
    {
      icon: TestIcon,
      title: 'Docs',
      body: 'Full documentation included.',
      ctaLabel: 'View docs',
      ctaHref: 'https://docs.example.com/guide',
    },
  ],
};

describe('FeatureGrid', () => {
  it('renders the section heading and subhead', () => {
    render(<FeatureGrid config={config} />);
    expect(screen.getByRole('heading', { name: 'Everything you need' })).toBeInTheDocument();
    expect(screen.getByText('A complete toolkit for modern SaaS.')).toBeInTheDocument();
  });

  it('renders all feature item titles and bodies', () => {
    render(<FeatureGrid config={config} />);
    expect(screen.getByText('Auth')).toBeInTheDocument();
    expect(screen.getByText('Secure authentication out of the box.')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Stripe-powered subscriptions.')).toBeInTheDocument();
  });

  it('renders internal CTA link without target or rel', () => {
    render(<FeatureGrid config={config} />);
    const link = screen.getByRole('link', { name: /Learn more/ });
    expect(link).toHaveAttribute('href', '#billing');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('renders external CTA link with target="_blank" and rel="noopener noreferrer"', () => {
    render(<FeatureGrid config={config} />);
    const link = screen.getByRole('link', { name: /View docs/ });
    expect(link).toHaveAttribute('href', 'https://docs.example.com/guide');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits CTA when ctaLabel and ctaHref are absent', () => {
    render(<FeatureGrid config={config} />);
    // Auth item has no CTA — only 2 CTA links should exist
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});

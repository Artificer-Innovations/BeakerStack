import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureRows } from '../FeatureRows';

const row = {
  title: 'Billing that ships.',
  body: 'Plan gating, metering, and a portal.',
  ctaLabel: 'See docs',
  ctaHref: '#pricing',
  mediaSrc: 'https://example.com/billing.png',
  mediaAlt: 'Billing screenshot',
  mediaSide: 'right' as const,
};

const externalRow = {
  ...row,
  title: 'Architecture docs',
  ctaLabel: 'Read docs',
  ctaHref: 'https://github.com/example/ARCHITECTURE.md',
  mediaSide: 'left' as const,
};

describe('FeatureRows', () => {
  it('renders row title and body', () => {
    render(<FeatureRows config={[row]} />);
    expect(screen.getByRole('heading', { name: 'Billing that ships.' })).toBeInTheDocument();
    expect(screen.getByText('Plan gating, metering, and a portal.')).toBeInTheDocument();
  });

  it('renders image with correct alt text', () => {
    render(<FeatureRows config={[row]} />);
    expect(screen.getByRole('img', { name: 'Billing screenshot' })).toBeInTheDocument();
  });

  it('renders CTA link with correct label', () => {
    render(<FeatureRows config={[row]} />);
    const link = screen.getByRole('link', { name: /see docs/i });
    expect(link).toHaveAttribute('href', '#pricing');
  });

  it('does not add target=_blank for internal CTA', () => {
    render(<FeatureRows config={[row]} />);
    const link = screen.getByRole('link', { name: /see docs/i });
    expect(link).not.toHaveAttribute('target');
  });

  it('adds target=_blank and rel=noopener for external CTA', () => {
    render(<FeatureRows config={[externalRow]} />);
    const link = screen.getByRole('link', { name: /read docs/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders multiple rows', () => {
    render(<FeatureRows config={[row, externalRow]} />);
    expect(screen.getByRole('heading', { name: 'Billing that ships.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Architecture docs' })).toBeInTheDocument();
  });

  it('renders empty list without error', () => {
    const { container } = render(<FeatureRows config={[]} />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });
});

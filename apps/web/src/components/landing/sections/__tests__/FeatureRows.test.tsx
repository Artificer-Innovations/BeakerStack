import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureRows } from '../FeatureRows';

const rows = [
  {
    title: 'Web and mobile from one codebase.',
    body: 'Shared auth, billing, and business rules across platforms.',
    ctaLabel: 'Learn about mobile',
    ctaHref: '#features',
    mediaSrc: 'https://placehold.co/560x315?text=Mobile',
    mediaAlt: 'BeakerStack web and mobile app screenshots side by side',
    mediaSide: 'right' as const,
  },
  {
    title: 'Set up in minutes.',
    body: 'A single npm run setup provisions your local environment.',
    ctaLabel: 'Read the architecture',
    ctaHref:
      'https://github.com/Artificer-Innovations/BeakerStack/blob/main/ARCHITECTURE.md',
    mediaSrc: 'https://placehold.co/560x315?text=Setup',
    mediaAlt: 'Setup screenshot',
    mediaSide: 'left' as const,
  },
];

describe('FeatureRows', () => {
  it('renders each row title and body', () => {
    render(<FeatureRows config={rows} />);
    expect(
      screen.getByRole('heading', { name: 'Web and mobile from one codebase.' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Shared auth, billing, and business rules across platforms.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Set up in minutes.' })
    ).toBeInTheDocument();
  });

  it('renders internal CTA link without target or rel', () => {
    render(<FeatureRows config={rows} />);
    const link = screen.getByRole('link', { name: /Learn about mobile/ });
    expect(link).toHaveAttribute('href', '#features');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('renders external CTA link with target="_blank" and rel="noopener noreferrer"', () => {
    render(<FeatureRows config={rows} />);
    const link = screen.getByRole('link', { name: /Read the architecture/ });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/Artificer-Innovations/BeakerStack/blob/main/ARCHITECTURE.md'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders images with lazy loading and correct alt text', () => {
    render(<FeatureRows config={rows} />);
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute(
      'alt',
      'BeakerStack web and mobile app screenshots side by side'
    );
    expect(images[0]).toHaveAttribute('loading', 'lazy');
    expect(images[1]).toHaveAttribute('alt', 'Setup screenshot');
  });
});

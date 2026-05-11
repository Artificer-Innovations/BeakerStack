import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureRows } from '../FeatureRows';

const baseRows = [
  {
    title: 'Web and mobile from one codebase.',
    body: 'Share auth, billing, and business logic.',
    ctaLabel: 'Learn more',
    ctaHref: '#features',
    mediaSrc: 'https://placehold.co/560x315',
    mediaAlt: 'Screenshot',
    mediaSide: 'right' as const,
  },
  {
    title: 'Environments that match your workflow.',
    body: 'Three Supabase databases mirror your branches.',
    ctaLabel: 'Read the architecture docs',
    ctaHref: 'https://github.com/Artificer-Innovations/BeakerStack/blob/main/ARCHITECTURE.md',
    mediaSrc: 'https://placehold.co/560x315',
    mediaAlt: 'Diagram',
    mediaSide: 'left' as const,
  },
];

describe('FeatureRows', () => {
  it('renders all row titles', () => {
    render(<FeatureRows config={baseRows} />);
    expect(screen.getByText('Web and mobile from one codebase.')).toBeInTheDocument();
    expect(screen.getByText('Environments that match your workflow.')).toBeInTheDocument();
  });

  it('renders all row body copy', () => {
    render(<FeatureRows config={baseRows} />);
    expect(screen.getByText('Share auth, billing, and business logic.')).toBeInTheDocument();
  });

  it('renders CTA links', () => {
    render(<FeatureRows config={baseRows} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(2);
  });

  it('renders media images', () => {
    render(<FeatureRows config={baseRows} />);
    expect(screen.getByAltText('Screenshot')).toBeInTheDocument();
    expect(screen.getByAltText('Diagram')).toBeInTheDocument();
  });

  it('does not add target/rel on internal CTA hrefs', () => {
    render(<FeatureRows config={baseRows} />);
    const links = screen.getAllByRole('link');
    const internalLink = links.find(l => l.getAttribute('href') === '#features');
    expect(internalLink).toBeTruthy();
    expect(internalLink).not.toHaveAttribute('target');
    expect(internalLink).not.toHaveAttribute('rel');
  });

  it('adds target="_blank" rel="noopener noreferrer" on external CTA hrefs', () => {
    render(<FeatureRows config={baseRows} />);
    const links = screen.getAllByRole('link');
    const externalLink = links.find(l =>
      l.getAttribute('href')?.startsWith('https://')
    );
    expect(externalLink).toBeTruthy();
    expect(externalLink).toHaveAttribute('target', '_blank');
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders empty section when config is empty', () => {
    const { container } = render(<FeatureRows config={[]} />);
    expect(container.querySelector('section')).toBeInTheDocument();
    expect(container.querySelectorAll('h2').length).toBe(0);
  });

  it('applies image-first layout when mediaSide is left', () => {
    render(<FeatureRows config={[baseRows[1]]} />);
    const img = screen.getByAltText('Diagram');
    const imgWrapper = img.closest('[class*="order-"]');
    expect(imgWrapper?.className).toContain('md:order-1');
  });

  it('applies text-first layout when mediaSide is right', () => {
    render(<FeatureRows config={[baseRows[0]]} />);
    const img = screen.getByAltText('Screenshot');
    const imgWrapper = img.closest('[class*="order-"]');
    expect(imgWrapper?.className).toContain('md:order-2');
  });
});

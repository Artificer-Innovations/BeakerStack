import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialProof } from '../SocialProof';

describe('SocialProof', () => {
  it('renders nothing when config is undefined', () => {
    const { container } = render(<SocialProof />);
    expect(container.firstChild).toBeNull();
  });

  describe('metrics variant', () => {
    const metricsConfig = {
      kind: 'metrics' as const,
      items: [
        { metric: '40–60%', label: 'Code shared between web and mobile' },
        { metric: '3 environments', label: 'PR preview, staging, and production' },
        { metric: 'MIT licensed', label: '100% open source, no vendor lock-in' },
      ],
    };

    it('renders all metric values', () => {
      render(<SocialProof config={metricsConfig} />);
      expect(screen.getByText('40–60%')).toBeInTheDocument();
      expect(screen.getByText('3 environments')).toBeInTheDocument();
      expect(screen.getByText('MIT licensed')).toBeInTheDocument();
    });

    it('renders all metric labels', () => {
      render(<SocialProof config={metricsConfig} />);
      expect(screen.getByText('Code shared between web and mobile')).toBeInTheDocument();
      expect(screen.getByText('PR preview, staging, and production')).toBeInTheDocument();
      expect(screen.getByText('100% open source, no vendor lock-in')).toBeInTheDocument();
    });
  });

  describe('testimonials variant', () => {
    const testimonialsConfig = {
      kind: 'testimonials' as const,
      items: [
        { quote: 'Amazing product', author: 'Alice', role: 'CTO' },
        { quote: 'Saved us months', author: 'Bob' },
      ],
    };

    it('renders all quotes', () => {
      render(<SocialProof config={testimonialsConfig} />);
      expect(screen.getByText(/"Amazing product"/)).toBeInTheDocument();
      expect(screen.getByText(/"Saved us months"/)).toBeInTheDocument();
    });

    it('renders author names', () => {
      render(<SocialProof config={testimonialsConfig} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('renders role when provided', () => {
      render(<SocialProof config={testimonialsConfig} />);
      expect(screen.getByText(', CTO')).toBeInTheDocument();
    });

    it('omits role when not provided', () => {
      render(<SocialProof config={testimonialsConfig} />);
      const quotes = screen.getAllByRole('blockquote');
      const bobQuote = quotes.find(q => q.textContent?.includes('Bob'));
      expect(bobQuote?.textContent).not.toContain(',');
    });
  });

  it('renders nothing for unknown kind', () => {
    const { container } = render(
      <SocialProof config={{ kind: 'unknown' as never, items: [] }} />
    );
    expect(container.querySelector('section')).toBeNull();
  });
});

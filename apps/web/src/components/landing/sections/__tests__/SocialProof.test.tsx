import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialProof } from '../SocialProof';

describe('SocialProof', () => {
  it('renders nothing when config is undefined', () => {
    const { container } = render(<SocialProof />);
    expect(container.firstChild).toBeNull();
  });

  it('renders metric values and labels', () => {
    render(
      <SocialProof
        config={{
          kind: 'metrics',
          items: [
            { metric: '10k+', label: 'Developers' },
            { metric: '99.9%', label: 'Uptime' },
          ],
        }}
      />
    );
    expect(screen.getByText('10k+')).toBeInTheDocument();
    expect(screen.getByText('Developers')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
  });

  it('renders testimonial quote and author', () => {
    render(
      <SocialProof
        config={{
          kind: 'testimonials',
          items: [{ quote: 'Love it!', author: 'Jane Doe' }],
        }}
      />
    );
    expect(screen.getByText(/Love it!/)).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders testimonial role when provided', () => {
    render(
      <SocialProof
        config={{
          kind: 'testimonials',
          items: [{ quote: 'Great!', author: 'Jane Doe', role: 'CTO at Acme' }],
        }}
      />
    );
    expect(screen.getByText(/CTO at Acme/)).toBeInTheDocument();
  });

  it('does not render role when absent', () => {
    render(
      <SocialProof
        config={{
          kind: 'testimonials',
          items: [{ quote: 'Great!', author: 'Jane Doe' }],
        }}
      />
    );
    expect(screen.queryByText(/CTO/)).not.toBeInTheDocument();
  });

  it('renders nothing for unhandled kinds', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<SocialProof config={{ kind: 'logos', items: [] } as any} />);
    expect(container.firstChild).toBeNull();
  });
});

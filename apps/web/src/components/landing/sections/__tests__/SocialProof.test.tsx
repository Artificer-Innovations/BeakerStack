import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialProof } from '../SocialProof';

describe('SocialProof', () => {
  it('renders nothing when config is undefined', () => {
    const { container } = render(<SocialProof />);
    expect(container.firstChild).toBeNull();
  });

  it('renders metrics section with metric values and labels', () => {
    render(
      <SocialProof
        config={{
          kind: 'metrics',
          items: [
            { metric: '10k+', label: 'Developers' },
            { metric: '99.9%', label: 'Uptime' },
            { metric: '< 5 min', label: 'Setup time' },
          ],
        }}
      />
    );
    expect(screen.getByText('10k+')).toBeInTheDocument();
    expect(screen.getByText('Developers')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('< 5 min')).toBeInTheDocument();
    expect(screen.getByText('Setup time')).toBeInTheDocument();
  });

  it('renders testimonials section with quotes and authors', () => {
    render(
      <SocialProof
        config={{
          kind: 'testimonials',
          items: [
            { quote: 'Best template I have used.', author: 'Alice', role: 'CTO' },
            { quote: 'Saved us weeks of work.', author: 'Bob' },
          ],
        }}
      />
    );
    expect(screen.getByText(/"Best template I have used\."/)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(', CTO')).toBeInTheDocument();
    expect(screen.getByText(/"Saved us weeks of work\."/)).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders testimonials without role when role is absent', () => {
    render(
      <SocialProof
        config={{
          kind: 'testimonials',
          items: [{ quote: 'Great product.', author: 'Carol' }],
        }}
      />
    );
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.queryByText(/,/)).not.toBeInTheDocument();
  });

  it('renders nothing for unsupported kind', () => {
    const { container } = render(
      <SocialProof config={{ kind: 'logos' as 'metrics', items: [] }} />
    );
    expect(container.firstChild).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureLimitRow } from '../FeatureLimitRow.web';

describe('FeatureLimitRow', () => {
  it('renders unlimited mode without ratio styling', () => {
    render(
      <FeatureLimitRow
        name='Widgets'
        used={4}
        cap={100}
        capIsUnlimited
      />
    );
    expect(screen.getByText('Widgets')).toBeInTheDocument();
    expect(screen.getByText(/4 of unlimited/)).toBeInTheDocument();
  });

  it('marks heavy usage below cap', () => {
    const { container } = render(
      <FeatureLimitRow name='A' used={8} cap={10} capIsUnlimited={false} />
    );
    expect(container.textContent).toContain('8 of 10');
    expect(container.querySelector('.text-amber-800')).toBeTruthy();
  });

  it('marks at-cap usage in red', () => {
    const { container } = render(
      <FeatureLimitRow name='B' used={10} cap={10} capIsUnlimited={false} />
    );
    expect(container.querySelector('.text-red-700')).toBeTruthy();
  });

  it('treats zero cap as ratio zero', () => {
    render(
      <FeatureLimitRow name='C' used={3} cap={0} capIsUnlimited={false} />
    );
    expect(screen.getByText(/3 of 0/)).toBeInTheDocument();
  });
});

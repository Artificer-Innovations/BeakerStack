import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Banner } from '../Banner.web';

describe('Banner', () => {
  it('renders children and title', () => {
    render(
      <Banner variant='warning' title='Heads up'>
        Something changed.
      </Banner>
    );
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Something changed.')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(
      <Banner variant='error' action={<button type='button'>Fix</button>}>
        Payment failed.
      </Banner>
    );
    expect(screen.getByRole('button', { name: 'Fix' })).toBeInTheDocument();
    expect(screen.getByText('Payment failed.')).toBeInTheDocument();
  });
});

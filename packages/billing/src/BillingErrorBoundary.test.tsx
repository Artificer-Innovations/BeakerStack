import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BillingErrorBoundary } from './BillingErrorBoundary.js';

function Boom(): React.ReactElement {
  throw new Error('billing boom');
}

describe('BillingErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders fallback when a child throws', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <BillingErrorBoundary
        fallback={(err, reset) => (
          <div>
            <p>{err.message}</p>
            <button type='button' onClick={reset}>
              Retry
            </button>
          </div>
        )}
      >
        <Boom />
      </BillingErrorBoundary>
    );
    expect(screen.getByText('billing boom')).toBeInTheDocument();
    errSpy.mockRestore();
  });

  it('reset restores children', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    function MaybeBoom(): React.ReactElement {
      if (shouldThrow) throw new Error('once');
      return <span>ok</span>;
    }
    render(
      <BillingErrorBoundary
        fallback={(_err, reset) => (
          <button type='button' onClick={reset}>
            Reset
          </button>
        )}
      >
        <MaybeBoom />
      </BillingErrorBoundary>
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('ok')).toBeInTheDocument();
    errSpy.mockRestore();
  });
});

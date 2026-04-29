import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { UpgradePrompt } from './UpgradePrompt.web.js';
import { useCheckout } from '../hooks/useCheckout.js';

vi.mock('../hooks/useCheckout.js', () => ({ useCheckout: vi.fn() }));

describe('UpgradePrompt (web)', () => {
  const startCheckout = vi.fn();

  beforeEach(() => {
    startCheckout.mockReset();
    vi.mocked(useCheckout).mockReturnValue({
      startCheckout,
      pending: false,
      error: null,
    });
    vi.stubGlobal('location', { href: '' } as Pick<
      Location,
      'href'
    > as Location);
  });

  it('assigns location when checkout returns url', async () => {
    startCheckout.mockResolvedValue({
      checkoutUrl: 'https://pay.example/start',
    });
    render(<UpgradePrompt targetTier='plan_pro' reason='Go pro' />);
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));
    await waitFor(() => {
      expect((globalThis.location as Location).href).toBe(
        'https://pay.example/start'
      );
    });
  });

  it('renders render-prop children', () => {
    startCheckout.mockResolvedValue(null);
    render(
      <UpgradePrompt targetTier='plan_pro' reason='x'>
        {({ pending }) => (
          <span data-testid='child'>{pending ? 'p' : 'r'}</span>
        )}
      </UpgradePrompt>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('r');
  });

  it('shows error message', () => {
    vi.mocked(useCheckout).mockReturnValue({
      startCheckout,
      pending: false,
      error: new Error('fail'),
    });
    render(<UpgradePrompt targetTier='plan_pro' reason='x' />);
    expect(screen.getByText('fail')).toBeInTheDocument();
  });
});

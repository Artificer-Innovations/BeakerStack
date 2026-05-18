import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import * as RN from 'react-native';
import { UpgradePrompt } from './UpgradePrompt.native.js';
import { useCheckout } from '../hooks/useCheckout.js';
import { launchStripeCheckout } from '../utils/launchStripeCheckout.native.js';

vi.mock('../hooks/useCheckout.js', () => ({ useCheckout: vi.fn() }));
vi.mock('../utils/launchStripeCheckout.native.js', () => ({
  launchStripeCheckout: vi.fn(),
}));

describe('UpgradePrompt (native)', () => {
  const startCheckout = vi.fn();

  beforeEach(() => {
    startCheckout.mockReset();
    vi.mocked(useCheckout).mockReturnValue({
      startCheckout,
      pending: false,
      error: null,
    });
    vi.spyOn(RN.Linking, 'openURL').mockResolvedValue(undefined as never);
    // Default: pass through real behavior so existing tests still see Linking.openURL called
    vi.mocked(launchStripeCheckout).mockImplementation(
      async (start, planId, cadence, trialDays) => {
        const result = await start(planId, cadence, trialDays);
        if (!result?.checkoutUrl) return false;
        await RN.Linking.openURL(result.checkoutUrl);
        return true;
      }
    );
  });

  it('opens checkout URL via Linking', async () => {
    startCheckout.mockResolvedValue({
      checkoutUrl: 'https://pay.example/start',
    });
    render(<UpgradePrompt targetTier='plan_pro' reason='Upgrade now' />);
    fireEvent.click(screen.getByText('Upgrade'));
    await waitFor(() => {
      expect(RN.Linking.openURL).toHaveBeenCalledWith(
        'https://pay.example/start'
      );
    });
  });

  it('renders via function children render-prop', () => {
    render(
      <UpgradePrompt targetTier='plan_pro' reason='Test'>
        {({ onUpgrade, pending }) => (
          <button onClick={() => void onUpgrade()} disabled={pending}>
            custom-upgrade
          </button>
        )}
      </UpgradePrompt>
    );
    expect(screen.getByText('custom-upgrade')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();
  });

  it('shows checkoutError.message as displayError when hook error is set', () => {
    vi.mocked(useCheckout).mockReturnValue({
      startCheckout,
      pending: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: { kind: 'stripe', message: 'hook-level-error' } as any,
    });
    render(<UpgradePrompt targetTier='plan_pro' reason='Upgrade reason' />);
    expect(screen.getByText('hook-level-error')).toBeInTheDocument();
  });

  it('shows "Could not start checkout" when launchStripeCheckout returns false', async () => {
    vi.mocked(launchStripeCheckout).mockResolvedValue(false);
    render(<UpgradePrompt targetTier='plan_pro' reason='Upgrade reason' />);
    fireEvent.click(screen.getByText('Upgrade'));
    await waitFor(() => {
      expect(screen.getByText('Could not start checkout')).toBeInTheDocument();
    });
  });
});

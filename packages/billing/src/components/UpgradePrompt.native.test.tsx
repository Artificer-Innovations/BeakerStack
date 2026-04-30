import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import * as RN from 'react-native';
import { UpgradePrompt } from './UpgradePrompt.native.js';
import { useCheckout } from '../hooks/useCheckout.js';

vi.mock('../hooks/useCheckout.js', () => ({ useCheckout: vi.fn() }));

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
});

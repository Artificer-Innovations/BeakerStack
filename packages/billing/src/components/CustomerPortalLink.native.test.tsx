import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import * as RN from 'react-native';
import { CustomerPortalLink } from './CustomerPortalLink.native.js';
import { useCustomerPortal } from '../hooks/useCustomerPortal.js';

vi.mock('../hooks/useCustomerPortal.js', () => ({
  useCustomerPortal: vi.fn(),
}));

describe('CustomerPortalLink (native)', () => {
  beforeEach(() => {
    vi.spyOn(RN.Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  it('wraps string children in Text and opens portal URL via Linking on press', async () => {
    const openPortal = vi.fn().mockResolvedValue('https://portal');
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal,
      pending: false,
      error: null,
    });
    render(<CustomerPortalLink>Portal</CustomerPortalLink>);
    fireEvent.click(screen.getByText('Portal'));
    expect(openPortal).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(RN.Linking.openURL).toHaveBeenCalledWith('https://portal');
    });
  });

  it('does not call Linking when openPortal returns null', async () => {
    const openPortal = vi.fn().mockResolvedValue(null);
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal,
      pending: false,
      error: null,
    });
    render(<CustomerPortalLink>Portal</CustomerPortalLink>);
    fireEvent.click(screen.getByText('Portal'));
    await waitFor(() => {
      expect(openPortal).toHaveBeenCalled();
    });
    expect(RN.Linking.openURL).not.toHaveBeenCalled();
  });
});

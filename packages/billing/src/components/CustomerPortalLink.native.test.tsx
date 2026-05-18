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

  it('renders React element children without an extra Text wrapper', () => {
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal: vi.fn().mockResolvedValue(null),
      pending: false,
      error: null,
    });
    render(
      <CustomerPortalLink>
        <span data-testid='elem-child'>Manage</span>
      </CustomerPortalLink>
    );
    expect(screen.getByTestId('elem-child')).toBeInTheDocument();
  });

  it('shows openError when openPortal throws and portalError is null', async () => {
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal: vi.fn().mockRejectedValue(new Error('portal down')),
      pending: false,
      error: null,
    });
    render(<CustomerPortalLink>Portal</CustomerPortalLink>);
    fireEvent.click(screen.getByText('Portal'));
    await waitFor(() =>
      expect(screen.getByText('portal down')).toBeInTheDocument()
    );
  });

  it('suppresses openError when portalError is also set (openError && !portalError is false)', async () => {
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal: vi.fn().mockRejectedValue(new Error('portal down')),
      pending: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: { kind: 'stripe', message: 'hook error' } as any,
    });
    render(<CustomerPortalLink>Portal</CustomerPortalLink>);
    fireEvent.click(screen.getByText('Portal'));
    await waitFor(() =>
      expect(screen.queryByText('portal down')).not.toBeInTheDocument()
    );
  });
});

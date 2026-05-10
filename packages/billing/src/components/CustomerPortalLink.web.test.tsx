import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CustomerPortalLink } from './CustomerPortalLink.web.js';
import { useCustomerPortal } from '../hooks/useCustomerPortal.js';

vi.mock('../hooks/useCustomerPortal.js', () => ({
  useCustomerPortal: vi.fn(),
}));

describe('CustomerPortalLink (web)', () => {
  beforeEach(() => {
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal: vi.fn().mockResolvedValue('https://portal'),
      pending: false,
      error: null,
    });
  });

  it('invokes openPortal on click', () => {
    const openPortal = vi.fn().mockResolvedValue('https://portal');
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal,
      pending: false,
      error: null,
    });
    render(<CustomerPortalLink>Manage billing</CustomerPortalLink>);
    fireEvent.click(screen.getByRole('button', { name: 'Manage billing' }));
    expect(openPortal).toHaveBeenCalledTimes(1);
  });

  it('disables while pending', () => {
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal: vi.fn(),
      pending: true,
      error: null,
    });
    render(<CustomerPortalLink>Wait</CustomerPortalLink>);
    expect(screen.getByRole('button', { name: 'Wait' })).toBeDisabled();
  });
});

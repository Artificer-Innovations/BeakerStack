import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CustomerPortalLink } from './CustomerPortalLink.native.js';
import { useCustomerPortal } from '../hooks/useCustomerPortal.js';

vi.mock('../hooks/useCustomerPortal.js', () => ({
  useCustomerPortal: vi.fn(),
}));

describe('CustomerPortalLink (native)', () => {
  beforeEach(() => {
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal: vi.fn().mockResolvedValue('https://portal'),
      pending: false,
      error: null,
    });
  });

  it('wraps string children in Text and calls openPortal on press', () => {
    const openPortal = vi.fn().mockResolvedValue('https://portal');
    vi.mocked(useCustomerPortal).mockReturnValue({
      openPortal,
      pending: false,
      error: null,
    });
    render(<CustomerPortalLink>Portal</CustomerPortalLink>);
    fireEvent.click(screen.getByText('Portal'));
    expect(openPortal).toHaveBeenCalledTimes(1);
  });
});

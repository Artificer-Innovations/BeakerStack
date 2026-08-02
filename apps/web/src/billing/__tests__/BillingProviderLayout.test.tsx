import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { BillingProviderLayout } from '../BillingProviderLayout';

const { BillingProviderSpy } = vi.hoisted(() => {
  const BillingProviderSpy = vi.fn(
    ({
      children,
      checkoutSuccessUrl,
    }: {
      children: React.ReactNode;
      checkoutSuccessUrl: string;
    }) => (
      <div
        data-testid='mock-billing-provider'
        data-success={checkoutSuccessUrl}
      >
        {children}
      </div>
    )
  );
  return { BillingProviderSpy };
});

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    BillingProvider: BillingProviderSpy,
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

describe('BillingProviderLayout', () => {
  beforeEach(() => {
    BillingProviderSpy.mockClear();
    vi.stubGlobal('location', {
      ...window.location,
      origin: 'https://app.test',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wraps routes with BillingProvider and renders the outlet', () => {
    render(
      <MemoryRouter initialEntries={['/billing']}>
        <Routes>
          <Route path='/billing' element={<BillingProviderLayout />}>
            <Route index element={<span>Billing child</span>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('mock-billing-provider')).toBeInTheDocument();
    expect(screen.getByText('Billing child')).toBeInTheDocument();
    const el = screen.getByTestId('mock-billing-provider');
    expect(el.getAttribute('data-success')).toMatch(/checkout=success/);
    expect(BillingProviderSpy).toHaveBeenCalled();
  });
});

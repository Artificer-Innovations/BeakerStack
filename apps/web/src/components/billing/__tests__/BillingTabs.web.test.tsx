import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BillingTabs } from '../BillingTabs.web';

describe('BillingTabs', () => {
  it('links to billing sections', () => {
    render(
      <MemoryRouter initialEntries={['/billing']}>
        <BillingTabs />
      </MemoryRouter>
    );
    const nav = screen.getByRole('navigation', { name: 'Billing sections' });
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/billing'
    );
    expect(within(nav).getByRole('link', { name: 'Plans' })).toHaveAttribute(
      'href',
      '/billing/plans'
    );
  });
});

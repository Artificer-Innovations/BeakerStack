import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillingPageShell } from '../BillingPageShell.web';

vi.mock('../../AppHeaderWithAdmin', () => ({
  AppHeaderWithAdmin: () => <header data-testid='app-header' />,
}));

describe('BillingPageShell', () => {
  it('renders header and children', () => {
    render(
      <BillingPageShell>
        <p>Inner</p>
      </BillingPageShell>
    );
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByText('Inner')).toBeInTheDocument();
  });
});

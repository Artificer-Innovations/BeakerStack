import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PolicyPage from '../PolicyPage';

vi.mock('@beakerstack/shared/generated/policies', () => ({
  POLICIES: {
    terms: '<h1>Terms of Service</h1><p>Terms content.</p>',
    privacy: '<h1>Privacy Policy</h1><p>Privacy content.</p>',
    refunds: '<h1>Refunds Policy</h1><p>Refunds content.</p>',
  },
}));

vi.mock('@beakerstack/shared/components/navigation/AppHeader.web', () => ({
  AppHeader: () => <header data-testid='app-header' />,
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

function renderPolicy(policy: 'terms' | 'privacy' | 'refunds') {
  return render(
    <MemoryRouter>
      <PolicyPage policy={policy} />
    </MemoryRouter>
  );
}

describe('PolicyPage', () => {
  it('renders terms HTML content', () => {
    renderPolicy('terms');
    expect(
      screen.getByRole('heading', { name: 'Terms of Service' })
    ).toBeInTheDocument();
    expect(screen.getByText('Terms content.')).toBeInTheDocument();
  });

  it('renders privacy HTML content', () => {
    renderPolicy('privacy');
    expect(
      screen.getByRole('heading', { name: 'Privacy Policy' })
    ).toBeInTheDocument();
    expect(screen.getByText('Privacy content.')).toBeInTheDocument();
  });

  it('renders refunds HTML content', () => {
    renderPolicy('refunds');
    expect(
      screen.getByRole('heading', { name: 'Refunds Policy' })
    ).toBeInTheDocument();
    expect(screen.getByText('Refunds content.')).toBeInTheDocument();
  });

  it('renders app header', () => {
    renderPolicy('terms');
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });
});

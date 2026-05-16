import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PolicyPage from '../PolicyPage';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');

vi.mock('@beakerstack/shared/generated/policies', () => ({
  POLICIES: {
    terms: '<h1>Terms of Service</h1><p>Terms content.</p>',
    privacy: '<h1>Privacy Policy</h1><p>Privacy content.</p>',
    refunds: '<h1>Refunds Policy</h1><p>Refunds content.</p>',
  },
}));

function renderPolicy(policy: 'terms' | 'privacy' | 'refunds') {
  return render(
    <MemoryRouter>
      <PolicyPage policy={policy} />
    </MemoryRouter>
  );
}

describe('PolicyPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it('renders public marketing header with Sign in link', () => {
    renderPolicy('terms');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login'
    );
  });
});

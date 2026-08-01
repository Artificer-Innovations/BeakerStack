import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HelpPage from '../HelpPage';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');

vi.mock('@beakerstack/help/web', () => ({
  HelpContent: () => <div data-testid='help-content'>Help content</div>,
}));

function renderHelpPage() {
  return render(
    <MemoryRouter>
      <HelpPage />
    </MemoryRouter>
  );
}

describe('HelpPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders public header and help content', () => {
    renderHelpPage();
    expect(screen.getByTestId('help-content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login'
    );
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useHref } from 'react-router-dom';
import { PublicShell } from '../PublicShell';

vi.mock('../App', () => ({
  default: function MockApp() {
    const href = useHref('/test');
    return (
      <div data-testid='app'>
        <span data-testid='href'>{href}</span>
      </div>
    );
  },
}));

describe('PublicShell', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders children without throwing', async () => {
    await act(async () => {
      render(<PublicShell basePath='/' />);
    });
    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument());
  });

  it('passes basePath to BrowserRouter as basename', async () => {
    window.history.pushState({}, '', '/myapp/');
    await act(async () => {
      render(<PublicShell basePath='/myapp' />);
    });
    await waitFor(() => expect(screen.getByTestId('href')).toBeInTheDocument());
    expect(screen.getByTestId('href').textContent).toBe('/myapp/test');
  });
});

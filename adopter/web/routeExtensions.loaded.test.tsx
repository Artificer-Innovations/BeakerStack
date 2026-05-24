import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./pages/DashboardPage', () => ({
  default: () => <h1>Loaded dashboard</h1>,
}));

describe('adopterRouteExtensions (loaded dashboard)', () => {
  it('renders the lazy dashboard route after the chunk resolves', async () => {
    const { adopterRouteExtensions } = await import('./routeExtensions');
    render(<MemoryRouter>{adopterRouteExtensions[0]?.element}</MemoryRouter>);

    expect(
      await screen.findByRole('heading', { name: 'Loaded dashboard' })
    ).toBeInTheDocument();
  });
});

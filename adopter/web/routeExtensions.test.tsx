import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { adopterRouteExtensions } from './routeExtensions';

vi.mock('./pages/DashboardPage', () => ({
  default: function SuspendingDashboard() {
    throw new Promise(() => {});
  },
}));

describe('adopterRouteExtensions', () => {
  it('registers the protected dashboard route', () => {
    expect(adopterRouteExtensions).toHaveLength(1);
    expect(adopterRouteExtensions[0]).toMatchObject({
      path: '/dashboard',
      auth: 'protected',
    });
  });

  it('renders PageFallback while the dashboard chunk is loading', () => {
    render(<MemoryRouter>{adopterRouteExtensions[0]?.element}</MemoryRouter>);

    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });
});

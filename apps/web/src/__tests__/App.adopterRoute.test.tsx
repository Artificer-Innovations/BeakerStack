import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdopterRoute } from '../App';

vi.mock('@beakerstack/shared/components/auth/ProtectedRoute.web', () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => (
    <div data-testid='protected-route'>{children}</div>
  ),
}));

describe('AdopterRoute', () => {
  it('renders public adopter routes without ProtectedRoute', () => {
    render(
      <AdopterRoute
        extension={{
          path: '/public-adopter',
          auth: 'public',
          element: <h1>Public adopter route</h1>,
        }}
      />
    );

    expect(screen.getByText('Public adopter route')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();
  });

  it('wraps protected adopter routes in ProtectedRoute', () => {
    render(
      <AdopterRoute
        extension={{
          path: '/dashboard',
          auth: 'protected',
          element: <h1>Protected adopter route</h1>,
        }}
      />
    );

    expect(screen.getByText('Protected adopter route')).toBeInTheDocument();
    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
  });

  it('defaults missing auth to protected', () => {
    render(
      <AdopterRoute
        extension={{
          path: '/dashboard',
          element: <h1>Default protected route</h1>,
        }}
      />
    );

    expect(screen.getByText('Default protected route')).toBeInTheDocument();
    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
  });
});

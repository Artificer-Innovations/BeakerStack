import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminRouteGate } from '../App';

const adminRouteProps = vi.hoisted(() => ({
  latest: null as {
    userId?: string;
    authLoading?: boolean;
  } | null,
}));

vi.mock('@beakerstack/admin/web', () => ({
  AdminRoute: ({
    children,
    userId,
    authLoading,
  }: {
    children: ReactNode;
    userId?: string;
    authLoading?: boolean;
  }) => {
    adminRouteProps.latest = { userId, authLoading };
    return <div data-testid='admin-route'>{children}</div>;
  },
}));

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'admin-user-id' },
    loading: false,
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

describe('AdminRouteGate', () => {
  it('passes the authenticated user id to AdminRoute', () => {
    render(
      <AdminRouteGate>
        <p>Admin child</p>
      </AdminRouteGate>
    );

    expect(screen.getByText('Admin child')).toBeInTheDocument();
    expect(adminRouteProps.latest).toEqual({
      userId: 'admin-user-id',
      authLoading: false,
    });
  });
});

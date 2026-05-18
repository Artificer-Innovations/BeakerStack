import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { listUsers } from '@beakerstack/admin';
import { useAdminUsers } from '../hooks/useAdminUsers';

vi.mock('@beakerstack/admin', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/admin')>();
  return {
    ...actual,
    listUsers: vi.fn(),
  };
});

const mockListUsers = vi.mocked(listUsers);

describe('useAdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListUsers.mockResolvedValue({
      users: [
        {
          user_id: 'u1',
          email: 'a@example.com',
          display_name: 'A',
          username: null,
          signup_at: '2024-01-01T00:00:00Z',
          last_active_at: null,
          plan_id: 'beakerstack_free',
          subscription_status: 'free',
          plan_display_name: 'Free',
          usage_current_period: { ai_summarize: 1 },
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    });
  });

  it('loads users on mount', async () => {
    const { result } = renderHook(() => useAdminUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.users).toHaveLength(1);
    expect(mockListUsers).toHaveBeenCalled();
  });

  it('surfaces errors from listUsers', async () => {
    mockListUsers.mockRejectedValueOnce(new Error('rpc failed'));
    const { result } = renderHook(() => useAdminUsers());
    await waitFor(() =>
      expect(result.current.error?.message).toBe('rpc failed')
    );
  });

  it('toggleSort flips direction on same column', async () => {
    const { result } = renderHook(() => useAdminUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.toggleSort('signup'));
    expect(result.current.sortDir).toBe('asc');
    act(() => result.current.toggleSort('last_active'));
    expect(result.current.sort).toBe('last_active');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { listWaitlistEntries } from '@beakerstack/waitlist';
import { useAdminWaitlist } from '../hooks/useAdminWaitlist';

vi.mock('@beakerstack/waitlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/waitlist')>();
  return {
    ...actual,
    listWaitlistEntries: vi.fn(),
  };
});

const mockList = vi.mocked(listWaitlistEntries);

const sampleResult = {
  entries: [
    {
      id: 'e1',
      email: 'wait@example.com',
      status: 'pending' as const,
      metadata: {},
      submitted_at: '2024-01-01T00:00:00Z',
      approved_at: null,
      rejected_at: null,
      converted_at: null,
      converted_user_id: null,
      has_active_invite: false,
    },
  ],
  total: 1,
  limit: 25,
  offset: 0,
};

describe('useAdminWaitlist', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(sampleResult);
  });

  it('loads entries on mount', async () => {
    const { result } = renderHook(() => useAdminWaitlist());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.entries).toHaveLength(1);
    expect(mockList).toHaveBeenCalled();
  });

  it('surfaces errors from listWaitlistEntries', async () => {
    mockList.mockRejectedValueOnce(new Error('list failed'));
    const { result } = renderHook(() => useAdminWaitlist());
    await waitFor(() =>
      expect(result.current.error?.message).toBe('list failed')
    );
  });

  it('waits for debounced search before loading', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAdminWaitlist());
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(result.current.loading).toBe(false);
      mockList.mockClear();

      act(() => result.current.setSearch('ada'));
      expect(mockList).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(mockList).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ search: 'ada', offset: 0 })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets offset when status filter changes', async () => {
    const { result } = renderHook(() => useAdminWaitlist());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setOffset(25));
    await waitFor(() => expect(result.current.offset).toBe(25));

    act(() => result.current.setStatus('approved'));
    await waitFor(() => expect(result.current.offset).toBe(0));
  });

  it('reload calls listWaitlistEntries again', async () => {
    const { result } = renderHook(() => useAdminWaitlist());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockList.mockClear();
    await act(async () => {
      await result.current.reload();
    });
    expect(mockList).toHaveBeenCalledTimes(1);
  });
});

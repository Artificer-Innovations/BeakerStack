import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { listUsers } from '@beakerstack/admin';
import { getAdminWaitlistSettings, listWaitlistEntries } from '@beakerstack/waitlist';
import { useAdminOverviewStats } from '../hooks/useAdminOverviewStats';

vi.mock('@beakerstack/admin', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/admin')>();
  return { ...actual, listUsers: vi.fn() };
});

vi.mock('@beakerstack/waitlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/waitlist')>();
  return {
    ...actual,
    listWaitlistEntries: vi.fn(),
    getAdminWaitlistSettings: vi.fn(),
  };
});

const mockListUsers = vi.mocked(listUsers);
const mockListWaitlistEntries = vi.mocked(listWaitlistEntries);
const mockGetSettings = vi.mocked(getAdminWaitlistSettings);

const fullSettings = {
  signup_mode: 'waitlist' as const,
  default_plan_id: '',
  invite_ttl_days: 7,
  identity_match_mode: 'lenient' as const,
  copy: {},
  metadata_schema: [],
  updated_at: '2024-01-01T00:00:00Z',
};

describe('useAdminOverviewStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListUsers.mockResolvedValue({
      users: [],
      total: 18,
      limit: 1,
      offset: 0,
    } as never);
    mockListWaitlistEntries.mockResolvedValue({
      entries: [],
      total: 3,
      limit: 1,
      offset: 0,
    });
    mockGetSettings.mockResolvedValue(fullSettings);
  });

  it('fetches all three stats on mount', async () => {
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.usersTotal).toBe(18);
    expect(result.current.waitlistPending).toBe(3);
    expect(result.current.signupMode).toBe('waitlist');
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors and sets values to null', async () => {
    mockListUsers.mockRejectedValueOnce(new Error('users failed'));
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('users failed');
    expect(result.current.usersTotal).toBeNull();
  });

  it('wraps non-Error throws into Error instances', async () => {
    mockListWaitlistEntries.mockRejectedValueOnce('boom');
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('boom');
  });

  it('handles null settings response', async () => {
    mockGetSettings.mockResolvedValue(null);
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signupMode).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles null list RPC responses gracefully', async () => {
    mockListUsers.mockResolvedValue(null as never);
    mockListWaitlistEntries.mockResolvedValue(null as never);
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.usersTotal).toBeNull();
    expect(result.current.waitlistPending).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

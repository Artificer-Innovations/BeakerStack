import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { listUsers } from '@beakerstack/admin';
import {
  getAdminWaitlistSettings,
  listWaitlistEntries,
} from '@beakerstack/waitlist';
import {
  getAdminMarketingEmailSettings,
  getAdminMarketingEmailQueueStats,
} from '@beakerstack/marketing-email';
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

vi.mock('@beakerstack/marketing-email', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@beakerstack/marketing-email')>();
  return {
    ...actual,
    getAdminMarketingEmailSettings: vi.fn(),
    getAdminMarketingEmailQueueStats: vi.fn(),
  };
});

const mockListUsers = vi.mocked(listUsers);
const mockListWaitlistEntries = vi.mocked(listWaitlistEntries);
const mockGetSettings = vi.mocked(getAdminWaitlistSettings);
const mockGetMeSettings = vi.mocked(getAdminMarketingEmailSettings);
const mockGetMeStats = vi.mocked(getAdminMarketingEmailQueueStats);

const fullSettings = {
  signup_mode: 'waitlist' as const,
  default_plan_id: '',
  invite_ttl_days: 7,
  identity_match_mode: 'lenient' as const,
  copy: {},
  metadata_schema: [],
  updated_at: '2024-01-01T00:00:00Z',
};

const meSettings = {
  product_id: 'test-product',
  enabled: true,
  provider: 'kit' as const,
  config: { namespace: 'ns', kitFormId: 'form-1', tierTagNames: [] },
  updated_at: '2024-01-01T00:00:00Z',
};

const meStats = { pending: 0, processing: 0, done: 10, failed: 0 };

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
    mockGetMeSettings.mockResolvedValue(meSettings);
    mockGetMeStats.mockResolvedValue(meStats);
  });

  it('fetches all overview stats on mount', async () => {
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.usersTotal).toBe(18);
    expect(result.current.waitlistPending).toBe(3);
    expect(result.current.signupMode).toBe('waitlist');
    expect(mockGetMeSettings).toHaveBeenCalledWith(expect.anything(), 'beakerstack');
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

  it('populates marketingEmail with settings and stats', async () => {
    const stats = { pending: 2, processing: 0, done: 5, failed: 1 };
    mockGetMeStats.mockResolvedValue(stats);
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.marketingEmail).toEqual({
      settings: meSettings,
      stats,
    });
  });

  it('sets marketingEmail.settings=null when no settings row exists', async () => {
    mockGetMeSettings.mockResolvedValue(null);
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.marketingEmail?.settings).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error when marketing email fetch throws', async () => {
    mockGetMeSettings.mockRejectedValueOnce(new Error('me network error'));
    const { result } = renderHook(() => useAdminOverviewStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('me network error');
    expect(result.current.marketingEmail).toBeNull();
  });
});

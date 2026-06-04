import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSignupMode } from './useSignupMode.js';
import * as client from '../waitlistClient.js';

describe('useSignupMode', () => {
  it('loads public settings and exposes mode flags', async () => {
    vi.spyOn(client, 'getPublicWaitlistSettings').mockResolvedValue({
      signup_mode: 'waitlist',
      copy: {},
      metadata_schema: [],
    });
    const supabase = {} as never;
    const { result } = renderHook(() => useSignupMode(supabase));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isWaitlist).toBe(true);
    expect(result.current.isOpen).toBe(false);
    vi.restoreAllMocks();
  });

  it('ignores settings result after unmount', async () => {
    let resolveSettings: (value: {
      signup_mode: 'open';
      copy: Record<string, never>;
      metadata_schema: never[];
    }) => void = () => {};
    vi.spyOn(client, 'getPublicWaitlistSettings').mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSettings = resolve;
        })
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = {} as never;
    const { unmount } = renderHook(() => useSignupMode(supabase));
    await waitFor(() =>
      expect(client.getPublicWaitlistSettings).toHaveBeenCalled()
    );
    unmount();
    resolveSettings({ signup_mode: 'open', copy: {}, metadata_schema: [] });
    await Promise.resolve();

    const unmountedWarnings = consoleSpy.mock.calls.filter(([message]) =>
      String(message).toLowerCase().includes('unmounted')
    );
    expect(unmountedWarnings).toHaveLength(0);

    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });
});

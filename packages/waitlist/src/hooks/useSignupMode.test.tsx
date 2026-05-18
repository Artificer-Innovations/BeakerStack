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
});

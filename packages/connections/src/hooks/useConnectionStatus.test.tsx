import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConnectionStatus } from './useConnectionStatus.js';
import { createMockSupabase } from '../test/mockSupabase.js';

const UUID_A = 'c1000000-0000-0000-0000-000000000001';
const UUID_B = 'c1000000-0000-0000-0000-000000000002';

describe('useConnectionStatus', () => {
  it('returns null status without user ids', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [],
      error: null,
    }));
    const { result } = renderHook(() =>
      useConnectionStatus(supabase, null, UUID_B)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBeNull();

    const { result: noOther } = renderHook(() =>
      useConnectionStatus(supabase, UUID_A, null)
    );
    await waitFor(() => expect(noOther.current.status).toBeNull());
  });

  it('loads status between two users', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [
        {
          status: 'pending',
          effective_status: 'pending',
          is_initiator: false,
          connection_id: 'c1000000-0000-0000-0000-000000000099',
        },
      ],
      error: null,
    }));
    const { result } = renderHook(() =>
      useConnectionStatus(supabase, UUID_A, UUID_B)
    );
    await waitFor(() =>
      expect(result.current.status?.effective_status).toBe('pending')
    );
  });

  it('maps errors', async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: { message: 'rate limit' },
    }));
    const { result } = renderHook(() =>
      useConnectionStatus(supabase, UUID_A, UUID_B)
    );
    await waitFor(() => expect(result.current.error?.kind).toBe('rate_limit'));
    expect(result.current.status).toBeNull();
  });
});

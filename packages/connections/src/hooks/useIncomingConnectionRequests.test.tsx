import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useIncomingConnectionRequests } from './useIncomingConnectionRequests.js';
import { createMockSupabase } from '../test/mockSupabase.js';

const UUID_ME = 'c1000000-0000-0000-0000-000000000001';
const UUID_OTHER = 'c1000000-0000-0000-0000-000000000002';

describe('useIncomingConnectionRequests', () => {
  it('filters pending rows where current user is recipient', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [
        {
          id: 'c1000000-0000-0000-0000-000000000099',
          status: 'pending',
          effective_status: 'pending',
          initiator_user_id: UUID_OTHER,
          recipient_user_id: UUID_ME,
          is_initiator: false,
          username: 'bob',
          display_name: 'Bob',
          avatar_url: null,
          created_at: '2026-01-01T00:00:00.000Z',
          accepted_at: null,
        },
        {
          id: 'c1000000-0000-0000-0000-000000000098',
          status: 'pending',
          effective_status: 'pending',
          initiator_user_id: UUID_ME,
          recipient_user_id: UUID_OTHER,
          is_initiator: true,
          username: 'carol',
          display_name: 'Carol',
          avatar_url: null,
          created_at: '2026-01-01T00:00:00.000Z',
          accepted_at: null,
        },
      ],
      error: null,
    }));

    const { result } = renderHook(() =>
      useIncomingConnectionRequests(supabase, UUID_ME)
    );
    await waitFor(() => expect(result.current.incoming).toHaveLength(1));
    expect(result.current.incoming[0]?.display_name).toBe('Bob');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionSearchPanel } from './ConnectionSearchPanel.web.js';
import { createMockSupabase } from '../test/mockSupabase.js';

const UUID_B = 'c1000000-0000-0000-0000-000000000002';

describe('ConnectionSearchPanel', () => {
  it('clears results for short queries on Enter', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [],
      error: null,
    }));
    const user = userEvent.setup();
    render(<ConnectionSearchPanel supabase={supabase} className='panel' />);

    await user.type(screen.getByLabelText('Find by username'), 'a');
    await user.keyboard('{Enter}');
    expect(
      screen.queryByRole('button', { name: 'Connect' })
    ).not.toBeInTheDocument();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('searches on Enter and lists connect actions', async () => {
    const onRequested = vi.fn();
    const supabase = createMockSupabase(async name => {
      if (name === 'connections_search_users') {
        return {
          data: [
            {
              user_id: UUID_B,
              username: 'bob',
              display_name: 'Bob',
              avatar_url: null,
            },
          ],
          error: null,
        };
      }
      return {
        data: [{ id: 'c1000000-0000-0000-0000-000000000099' }],
        error: null,
      };
    });
    const user = userEvent.setup();
    render(
      <ConnectionSearchPanel supabase={supabase} onRequested={onRequested} />
    );

    await user.type(screen.getByLabelText('Find by username'), 'bob');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(onRequested).toHaveBeenCalled());
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('shows search errors', async () => {
    const supabase = createMockSupabase(async () => ({
      data: null,
      error: { message: 'fetch failed' },
    }));
    const user = userEvent.setup();
    render(<ConnectionSearchPanel supabase={supabase} />);
    await user.type(screen.getByLabelText('Find by username'), 'bob');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('fetch failed')
    );
  });

  it('shows empty state when search returns no rows', async () => {
    const supabase = createMockSupabase(async () => ({
      data: [],
      error: null,
    }));
    const user = userEvent.setup();
    render(<ConnectionSearchPanel supabase={supabase} />);
    await user.type(screen.getByLabelText('Find by username'), 'nobody');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(screen.getByText(/No one matched/i)).toBeInTheDocument()
    );
  });

  it('shows request errors', async () => {
    const supabase = createMockSupabase(async name => {
      if (name === 'connections_search_users') {
        return {
          data: [
            {
              user_id: UUID_B,
              username: 'bob',
              display_name: 'Bob',
              avatar_url: null,
            },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: 'rate limit exceeded' } };
    });
    const user = userEvent.setup();
    render(<ConnectionSearchPanel supabase={supabase} />);
    await user.type(screen.getByLabelText('Find by username'), 'bob');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => screen.getByRole('button', { name: 'Connect' }));
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('rate limit')
    );
  });
});

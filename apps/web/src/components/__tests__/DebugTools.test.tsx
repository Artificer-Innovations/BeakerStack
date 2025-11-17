import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DebugTools } from '../DebugTools';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })),
  },
}));

const createMockSupabaseClient = (): SupabaseClient => {
  return {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })),
  } as unknown as SupabaseClient;
};

const renderWithProviders = (component: React.ReactElement) => {
  const mockClient = createMockSupabaseClient();
  return render(
    <BrowserRouter>
      <AuthProvider supabaseClient={mockClient}>
        <ProfileProvider supabaseClient={mockClient}>
          {component}
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe.skip('DebugTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders hidden activation area initially', () => {
    renderWithProviders(<DebugTools />);
    const hiddenArea = screen.getByLabelText('Debug tools activation');
    expect(hiddenArea).toBeInTheDocument();
    expect(hiddenArea).toHaveStyle({ opacity: 0 });
  });

  it('shows debug tools after 4 clicks', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DebugTools />);

    const hiddenArea = screen.getByLabelText('Debug tools activation');

    // Click 4 times
    for (let i = 0; i < 4; i++) {
      await user.click(hiddenArea);
    }

    await waitFor(() => {
      expect(screen.getByText('🧪 Debug Tools')).toBeInTheDocument();
    });
  });

  it.skip('resets click counter after 2 seconds of inactivity', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DebugTools />);

    const hiddenArea = screen.getByLabelText('Debug tools activation');

    // Click 3 times
    await user.click(hiddenArea);
    await user.click(hiddenArea);
    await user.click(hiddenArea);

    // Wait 2+ seconds
    vi.advanceTimersByTime(2500);

    // Click once more - should not open (counter was reset)
    await user.click(hiddenArea);

    // Should still be hidden
    expect(screen.queryByText('🧪 Debug Tools')).not.toBeInTheDocument();
  });

  it('shows close button when debug tools are visible', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DebugTools />);

    const hiddenArea = screen.getByLabelText('Debug tools activation');

    // Click 4 times to open
    for (let i = 0; i < 4; i++) {
      await user.click(hiddenArea);
    }

    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  it('closes debug tools when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DebugTools />);

    const hiddenArea = screen.getByLabelText('Debug tools activation');

    // Click 4 times to open
    for (let i = 0; i < 4; i++) {
      await user.click(hiddenArea);
    }

    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('🧪 Debug Tools')).not.toBeInTheDocument();
    });
  });

  it('renders database test section', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DebugTools />);

    const hiddenArea = screen.getByLabelText('Debug tools activation');

    // Click 4 times to open
    for (let i = 0; i < 4; i++) {
      await user.click(hiddenArea);
    }

    await waitFor(() => {
      expect(
        screen.getByText('🧪 Database Connection Test')
      ).toBeInTheDocument();
      expect(screen.getByText('🧪 Test Database')).toBeInTheDocument();
    });
  });

  it('renders AuthContext test section', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DebugTools />);

    const hiddenArea = screen.getByLabelText('Debug tools activation');

    // Click 4 times to open
    for (let i = 0; i < 4; i++) {
      await user.click(hiddenArea);
    }

    await waitFor(() => {
      expect(screen.getByText('🧪 AuthContext Test')).toBeInTheDocument();
    });
  });

  it('shows message to sign in for profile-related tests when not authenticated', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DebugTools />);

    const hiddenArea = screen.getByLabelText('Debug tools activation');

    // Click 4 times to open
    for (let i = 0; i < 4; i++) {
      await user.click(hiddenArea);
    }

    await waitFor(() => {
      expect(
        screen.getByText(/please sign in to test this component/i)
      ).toBeInTheDocument();
    });
  });
});

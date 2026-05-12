import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoControlsPanel } from '../DemoControlsPanel';

const refreshSubscription = vi.fn().mockResolvedValue(undefined);
const refreshUsage = vi.fn().mockResolvedValue(undefined);

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    usePlan: () => ({
      data: { id: 'beakerstack_free', display_name: 'Free' },
      loading: false,
      error: null,
    }),
    useBillingContext: () => ({
      refreshSubscription,
      config: {},
    }),
    useUsage: () => ({
      used: 0,
      limit: 10,
      refresh: refreshUsage,
      loading: false,
      error: null,
      exceeded: false,
      remaining: 10,
      resetsAt: null,
    }),
  };
});

const demoSupabase = vi.hoisted(() => {
  const rpc = vi.fn();
  const client = { rpc };
  return { rpc, client };
});

vi.mock('@/lib/supabase', () => ({
  supabase: demoSupabase.client,
  supabaseRpc: demoSupabase.client,
}));

describe('DemoControlsPanel', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BILLING_DEMO_MODE', 'true');
    demoSupabase.rpc.mockReset();
    refreshSubscription.mockClear();
    refreshUsage.mockClear();
    demoSupabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders nothing when VITE_BILLING_DEMO_MODE is not true', () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_BILLING_DEMO_MODE', 'false');
    const { container } = render(<DemoControlsPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('shows current plan and runs simulate upgrade RPC', async () => {
    const user = userEvent.setup();
    render(<DemoControlsPanel />);
    expect(screen.getByText(/Current plan:/i)).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Switch to Pro/i }));
    expect(demoSupabase.rpc).toHaveBeenCalledWith(
      'billing_demo_simulate_upgrade',
      {
        p_product_id: 'beakerstack',
        p_plan_id: 'beakerstack_pro',
      }
    );
    await waitFor(() => {
      expect(refreshSubscription).toHaveBeenCalled();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Done.');
  });

  it('shows friendly message when RPC throws non-Error', async () => {
    const user = userEvent.setup();
    demoSupabase.rpc.mockRejectedValue('fail');
    render(<DemoControlsPanel />);
    await user.click(screen.getByRole('button', { name: /Switch to Max/i }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Request failed/i);
    });
  });

  it('shows Error message when RPC rejects with Error', async () => {
    const user = userEvent.setup();
    demoSupabase.rpc.mockRejectedValue(new Error('database unavailable'));
    render(<DemoControlsPanel />);
    await user.click(screen.getByRole('button', { name: /Switch to Pro/i }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'database unavailable'
      );
    });
  });

  it('resets usage for each meter and refreshes usage', async () => {
    const user = userEvent.setup();
    render(<DemoControlsPanel />);
    await user.click(
      screen.getByRole('button', { name: /Reset all usage counters/i })
    );
    expect(demoSupabase.rpc).toHaveBeenCalledWith(
      'billing_demo_reset_usage',
      expect.objectContaining({ p_product_id: 'beakerstack' })
    );
    await waitFor(() => {
      expect(refreshUsage).toHaveBeenCalled();
    });
  });
});

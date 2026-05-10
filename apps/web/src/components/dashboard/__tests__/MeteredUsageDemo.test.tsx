import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MeteredUsageDemo } from '../MeteredUsageDemo';

const usage = vi.hoisted(() => ({
  used: 2,
  limit: 10 as number | null,
  resetsAt: '2026-06-01T00:00:00.000Z' as string | null,
  exceeded: false,
  loading: false,
  error: null as { message: string } | null,
  refresh: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useBillingContext: () => ({
      config: { productId: 'beakerstack' },
    }),
    useUsage: () => ({
      used: usage.used,
      limit: usage.limit,
      resetsAt: usage.resetsAt,
      exceeded: usage.exceeded,
      loading: usage.loading,
      error: usage.error,
      refresh: usage.refresh,
      remaining:
        usage.limit != null ? Math.max(0, usage.limit - usage.used) : null,
    }),
  };
});

const meterSupabase = vi.hoisted(() => {
  const rpc = vi.fn();
  const invoke = vi.fn();
  const client = {
    rpc,
    functions: { invoke },
  };
  return { rpc, invoke, client };
});

vi.mock('@/lib/supabase', () => ({
  supabase: meterSupabase.client,
  supabaseRpc: meterSupabase.client,
}));

const renderMetered = () =>
  render(
    <MemoryRouter>
      <MeteredUsageDemo />
    </MemoryRouter>
  );

describe('MeteredUsageDemo', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    usage.used = 2;
    usage.limit = 10;
    usage.resetsAt = '2026-06-01T00:00:00.000Z';
    usage.exceeded = false;
    usage.loading = false;
    usage.error = null;
    usage.refresh.mockClear();
    meterSupabase.rpc.mockReset();
    meterSupabase.invoke.mockReset();
    meterSupabase.rpc.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows loading placeholder in cap line when usage is loading', () => {
    usage.loading = true;
    renderMetered();
    expect(screen.getByTestId('usage-indicator-expanded')).toHaveTextContent(
      '…'
    );
  });

  it('renders unlimited cap copy when limit is null', () => {
    usage.limit = null;
    renderMetered();
    expect(screen.getByText(/unlimited/i)).toBeInTheDocument();
  });

  it('uses em dash when limit set but resetsAt missing', () => {
    usage.resetsAt = null;
    renderMetered();
    expect(screen.getByText(/resets —/)).toBeInTheDocument();
  });

  it('records usage then refreshes and shows AI result', async () => {
    const user = userEvent.setup();
    renderMetered();
    await user.click(
      screen.getByRole('button', { name: /Simulate AI summarize/i })
    );
    await waitFor(() => {
      expect(meterSupabase.rpc).toHaveBeenCalledWith(
        'billing_record_usage_event',
        expect.objectContaining({
          p_product_id: 'beakerstack',
          p_event_type: 'ai_summarize',
          p_quantity: 1,
        })
      );
    });
    await waitFor(() => {
      expect(usage.refresh).toHaveBeenCalled();
    });
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('does not simulate when already exceeded', async () => {
    const user = userEvent.setup();
    usage.exceeded = true;
    renderMetered();
    expect(screen.getByText(/Limit reached/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upgrade/i })).toHaveAttribute(
      'href',
      '/billing/plans'
    );
    expect(
      screen.queryByRole('button', { name: /Simulate AI summarize/i })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Upgrade/i }));
    expect(meterSupabase.rpc).not.toHaveBeenCalled();
  });

  it('shows usage hook error in alert', () => {
    usage.error = { message: 'Usage unavailable' };
    renderMetered();
    expect(screen.getByRole('alert')).toHaveTextContent('Usage unavailable');
  });

  it('maps RPC failure to billing error message', async () => {
    const user = userEvent.setup();
    meterSupabase.rpc.mockRejectedValue(new Error('cap exceeded'));
    renderMetered();
    await user.click(
      screen.getByRole('button', { name: /Simulate AI summarize/i })
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('cap exceeded');
    });
  });
});

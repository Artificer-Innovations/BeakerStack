import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UsageStrip } from '../UsageStrip';

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
  const client = { rpc, functions: { invoke } };
  return { rpc, invoke, client };
});

vi.mock('@/lib/supabase', () => ({
  supabase: meterSupabase.client,
  supabaseRpc: meterSupabase.client,
}));

const onActivity = vi.fn();

const renderStrip = () =>
  render(
    <MemoryRouter>
      <UsageStrip onActivity={onActivity} />
    </MemoryRouter>
  );

describe('UsageStrip', () => {
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
    onActivity.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows loading placeholder in cap line when usage is loading', () => {
    usage.loading = true;
    renderStrip();
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('renders unlimited cap copy when limit is null', () => {
    usage.limit = null;
    renderStrip();
    expect(screen.getByText(/unlimited/i)).toBeInTheDocument();
  });

  it('uses em dash when limit set but resetsAt missing', () => {
    usage.resetsAt = null;
    renderStrip();
    expect(screen.getByText(/resets —/)).toBeInTheDocument();
  });

  it('records usage then refreshes and shows AI result', async () => {
    const user = userEvent.setup();
    renderStrip();
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
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_record_usage_event' })
    );
  });

  it('does not simulate when already exceeded', async () => {
    const user = userEvent.setup();
    usage.exceeded = true;
    renderStrip();
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
    renderStrip();
    expect(screen.getByRole('alert')).toHaveTextContent('Usage unavailable');
  });

  it('maps RPC failure to billing error message', async () => {
    const user = userEvent.setup();
    meterSupabase.rpc.mockRejectedValue(new Error('cap exceeded'));
    renderStrip();
    await user.click(
      screen.getByRole('button', { name: /Simulate AI summarize/i })
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('cap exceeded');
    });
  });
});

describe('UsageStrip (VITE_DEMO_USE_REAL_AI)', () => {
  beforeEach(() => {
    usage.used = 2;
    usage.limit = 10;
    usage.exceeded = false;
    usage.refresh.mockClear();
    meterSupabase.rpc.mockReset();
    meterSupabase.invoke.mockReset();
    meterSupabase.rpc.mockResolvedValue({ error: null });
    onActivity.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function renderWithRealAiEnv() {
    vi.resetModules();
    vi.stubEnv('VITE_DEMO_USE_REAL_AI', 'true');
    const { UsageStrip: Strip } = await import('../UsageStrip');
    return render(
      <MemoryRouter>
        <Strip onActivity={onActivity} />
      </MemoryRouter>
    );
  }

  it('uses edge function text when invoke succeeds', async () => {
    const user = userEvent.setup();
    meterSupabase.invoke.mockResolvedValue({
      data: { text: '  Edge summary  ' },
      error: null,
    });
    await renderWithRealAiEnv();
    await user.click(
      screen.getByRole('button', { name: /Simulate AI summarize/i })
    );
    await waitFor(() => {
      expect(screen.getByText('Edge summary')).toBeInTheDocument();
    });
  });

  it('falls back when invoke returns empty text', async () => {
    const user = userEvent.setup();
    meterSupabase.invoke.mockResolvedValue({
      data: { text: '   ' },
      error: null,
    });
    await renderWithRealAiEnv();
    await user.click(
      screen.getByRole('button', { name: /Simulate AI summarize/i })
    );
    await waitFor(() => {
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });
  });

  it('falls back when invoke throws', async () => {
    const user = userEvent.setup();
    meterSupabase.invoke.mockRejectedValue(new Error('offline'));
    await renderWithRealAiEnv();
    await user.click(
      screen.getByRole('button', { name: /Simulate AI summarize/i })
    );
    await waitFor(() => {
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });
  });
});

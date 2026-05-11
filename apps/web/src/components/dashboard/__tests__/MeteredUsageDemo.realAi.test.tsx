/**
 * `useRealAi` is resolved when this module loads — set env before importing `MeteredUsageDemo`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

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

async function renderWithRealAiEnv() {
  vi.resetModules();
  vi.stubEnv('VITE_DEMO_USE_REAL_AI', 'true');
  const { MeteredUsageDemo } = await import('../MeteredUsageDemo');
  return render(
    <MemoryRouter>
      <MeteredUsageDemo />
    </MemoryRouter>
  );
}

describe('MeteredUsageDemo (VITE_DEMO_USE_REAL_AI)', () => {
  beforeEach(() => {
    usage.used = 2;
    usage.limit = 10;
    usage.exceeded = false;
    usage.refresh.mockClear();
    meterSupabase.rpc.mockReset();
    meterSupabase.invoke.mockReset();
    meterSupabase.rpc.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

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

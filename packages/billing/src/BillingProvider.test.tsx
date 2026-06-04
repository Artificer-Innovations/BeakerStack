import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { ZodError } from 'zod';
import { BillingProvider } from './BillingProvider.js';
import { useBillingContext } from './hooks/useBillingContext.js';
import { productBillingConfigSchema } from './schema.js';
import {
  testBillingConfig,
  testPlan,
  testSubscription,
} from './test/billingFixtures.js';

function Reader() {
  const { userId, subscription } = useBillingContext();
  return (
    <div>
      <span data-testid='uid'>{userId ?? 'null'}</span>
      <span data-testid='subid'>{subscription?.id ?? 'none'}</span>
    </div>
  );
}

function SubscriptionErrorReader() {
  const { subscriptionError } = useBillingContext();
  return (
    <span data-testid='suberr'>
      {subscriptionError ? subscriptionError.kind : 'none'}
    </span>
  );
}

const auth = vi.hoisted(() => {
  const state = { session: null as { user?: { id: string } } | null };
  const unsubscribe = vi.fn();
  const getSession = vi.fn(() =>
    Promise.resolve({ data: { session: state.session } })
  );
  const authListener = {
    callback: null as
      | ((_event: string, session: { user?: { id: string } } | null) => void)
      | null,
  };
  const onAuthStateChange = vi.fn(
    (
      cb: (_event: string, session: { user?: { id: string } } | null) => void
    ) => {
      authListener.callback = cb;
      return { data: { subscription: { unsubscribe } } };
    }
  );
  return { state, getSession, onAuthStateChange, unsubscribe, authListener };
});

const db = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const planMaybeSingle = vi.fn();
  const subChain = {
    select: vi.fn(() => subChain),
    eq: vi.fn(() => subChain),
    maybeSingle,
  };
  const planChain = {
    select: vi.fn(() => planChain),
    eq: vi.fn(() => planChain),
    maybeSingle: planMaybeSingle,
  };
  const rpc = vi.fn();
  const subscriptionRealtime = {
    handler: null as
      | ((payload: { new?: unknown; old?: unknown }) => void)
      | null,
  };
  const ch = {
    on: vi.fn(
      (
        type: string,
        _cfg: unknown,
        cb: (payload: { new?: unknown; old?: unknown }) => void
      ) => {
        if (type === 'postgres_changes') subscriptionRealtime.handler = cb;
        return ch;
      }
    ),
    subscribe: vi.fn(),
  };
  const channel = vi.fn(() => ch);
  const removeChannel = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === 'billing_subscriptions') return subChain;
    if (table === 'billing_plans') return planChain;
    throw new Error(`unexpected table ${table}`);
  });
  return {
    maybeSingle,
    planMaybeSingle,
    rpc,
    from,
    channel,
    ch,
    removeChannel,
    subscriptionRealtime,
  };
});

const supabase = {
  auth: {
    getSession: auth.getSession,
    onAuthStateChange: auth.onAuthStateChange,
  },
  from: db.from,
  rpc: db.rpc,
  channel: db.channel,
  removeChannel: db.removeChannel,
} as unknown as import('@supabase/supabase-js').SupabaseClient;

const providerProps = {
  supabase,
  checkoutSuccessUrl: 'https://ok',
  checkoutCancelUrl: 'https://cancel',
  portalReturnUrl: 'https://portal',
};

describe('BillingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.state.session = null;
    db.maybeSingle.mockResolvedValue({ data: null, error: null });
    db.planMaybeSingle.mockResolvedValue({ data: null, error: null });
    db.rpc.mockResolvedValue({ error: null });
  });

  it('renders children with null user when no session', async () => {
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('uid').textContent).toBe('null');
    });
  });

  it('loads subscription after auth session and RPC', async () => {
    auth.state.session = { user: { id: 'u-99' } };
    const row = { ...testSubscription(), user_id: 'u-99' };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('uid').textContent).toBe('u-99');
    });
    await waitFor(() => {
      expect(screen.getByTestId('subid').textContent).toBe('sub_1');
    });
    expect(db.rpc).toHaveBeenCalledWith('ensure_billing_subscription', {
      p_product_id: 'test_product',
    });
    expect(db.from).toHaveBeenCalledWith('billing_subscriptions');
    expect(db.channel).toHaveBeenCalled();
  });

  it('does not throw when window exists without location (React Native)', async () => {
    const realWindow = globalThis.window;
    const windowProxy = new Proxy(realWindow, {
      get(target, prop, receiver) {
        if (prop === 'location') return undefined;
        return Reflect.get(target, prop, receiver);
      },
    });
    vi.stubGlobal('window', windowProxy);

    try {
      auth.state.session = { user: { id: 'u-rn' } };
      db.maybeSingle.mockResolvedValue({ data: null, error: null });
      render(
        <BillingProvider config={testBillingConfig} {...providerProps}>
          <Reader />
        </BillingProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('uid').textContent).toBe('u-rn');
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects invalid config with the same schema BillingProvider uses', () => {
    expect(() =>
      productBillingConfigSchema.parse({
        productId: '',
        displayName: 'x',
        plans: [],
      })
    ).toThrow(ZodError);
  });

  it('surfaces subscription query errors', async () => {
    auth.state.session = { user: { id: 'u-err' } };
    db.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error('select failed'),
    });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <SubscriptionErrorReader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('suberr').textContent).toBe('unknown');
    });
  });

  it('surfaces ensure_billing_subscription RPC errors', async () => {
    auth.state.session = { user: { id: 'u-rpc' } };
    db.rpc.mockResolvedValue({ error: new Error('rpc failed') });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <SubscriptionErrorReader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('suberr').textContent).toBe('unknown');
    });
  });

  it('reloads subscription when realtime payload matches product', async () => {
    auth.state.session = { user: { id: 'u-99' } };
    const row = { ...testSubscription(), user_id: 'u-99' };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('subid').textContent).toBe('sub_1');
    });
    db.maybeSingle.mockClear();
    db.subscriptionRealtime.handler?.({
      new: { ...row, product_id: 'test_product' },
      old: null,
    });
    await waitFor(() => {
      expect(db.maybeSingle).toHaveBeenCalled();
    });
  });

  it('updates user id from auth state changes', async () => {
    auth.state.session = { user: { id: 'u-a' } };
    db.maybeSingle.mockResolvedValue({
      data: { ...testSubscription(), user_id: 'u-a' },
      error: null,
    });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('uid').textContent).toBe('u-a');
    });
    auth.authListener.callback?.('SIGNED_IN', { user: { id: 'u-b' } });
    await waitFor(() => {
      expect(screen.getByTestId('uid').textContent).toBe('u-b');
    });
  });

  it('removes realtime channel when user signs out', async () => {
    auth.state.session = { user: { id: 'u-out' } };
    db.maybeSingle.mockResolvedValue({
      data: { ...testSubscription(), user_id: 'u-out' },
      error: null,
    });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(db.channel).toHaveBeenCalled();
    });
    db.removeChannel.mockClear();
    auth.authListener.callback?.('SIGNED_OUT', null);
    await waitFor(() => {
      expect(screen.getByTestId('uid').textContent).toBe('null');
    });
    expect(db.removeChannel).toHaveBeenCalled();
  });

  function EarlyRefreshCaller() {
    const { refreshSubscription } = useBillingContext();
    useEffect(() => {
      void refreshSubscription();
    }, [refreshSubscription]);
    return <span data-testid='early'>ok</span>;
  }

  it('refreshSubscription no-ops when there is no user', async () => {
    auth.state.session = null;
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <EarlyRefreshCaller />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('early').textContent).toBe('ok');
    });
    expect(db.from).not.toHaveBeenCalledWith('billing_subscriptions');
  });

  function ManualRefreshButton() {
    const { refreshSubscription } = useBillingContext();
    return (
      <button
        type='button'
        data-testid='refresh-sub'
        onClick={() => void refreshSubscription()}
      >
        Refresh
      </button>
    );
  }

  it('refreshSubscription reloads subscription when user is signed in', async () => {
    auth.state.session = { user: { id: 'u-refresh' } };
    const row = { ...testSubscription(), user_id: 'u-refresh' };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
        <ManualRefreshButton />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('subid').textContent).toBe('sub_1');
    });
    db.maybeSingle.mockClear();
    screen.getByTestId('refresh-sub').click();
    await waitFor(() => {
      expect(db.maybeSingle).toHaveBeenCalled();
    });
  });

  function PlanReader() {
    const { plan, planLoading, planError } = useBillingContext();
    return (
      <div>
        <span data-testid='plan'>{plan?.display_name ?? 'none'}</span>
        <span data-testid='plan-loading'>{planLoading ? 'yes' : 'no'}</span>
        <span data-testid='plan-err'>{planError?.kind ?? 'none'}</span>
      </div>
    );
  }

  it('loads plan row when subscription has plan_id', async () => {
    auth.state.session = { user: { id: 'u-plan' } };
    const row = {
      ...testSubscription(),
      user_id: 'u-plan',
      plan_id: 'plan_free',
    };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    db.planMaybeSingle.mockResolvedValue({
      data: testPlan({ id: 'plan_free', display_name: 'Free' }),
      error: null,
    });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <PlanReader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('plan').textContent).toBe('Free');
    });
    expect(screen.getByTestId('plan-loading').textContent).toBe('no');
  });

  it('surfaces plan query errors', async () => {
    auth.state.session = { user: { id: 'u-plan-err' } };
    const row = { ...testSubscription(), user_id: 'u-plan-err' };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    db.planMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error('plan select failed'),
    });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <PlanReader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('plan-err').textContent).toBe('unknown');
    });
  });

  it('ignores realtime payload for a different product', async () => {
    auth.state.session = { user: { id: 'u-99' } };
    const row = { ...testSubscription(), user_id: 'u-99' };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('subid').textContent).toBe('sub_1');
    });
    db.maybeSingle.mockClear();
    db.subscriptionRealtime.handler?.({
      new: { ...row, product_id: 'other_product' },
      old: null,
    });
    await Promise.resolve();
    expect(db.maybeSingle).not.toHaveBeenCalled();
  });

  it('reloads subscription when realtime payload only includes old row', async () => {
    auth.state.session = { user: { id: 'u-99' } };
    const row = { ...testSubscription(), user_id: 'u-99' };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('subid').textContent).toBe('sub_1');
    });
    db.maybeSingle.mockClear();
    db.subscriptionRealtime.handler?.({
      new: undefined,
      old: { ...row, product_id: 'test_product' },
    });
    await waitFor(() => {
      expect(db.maybeSingle).toHaveBeenCalled();
    });
  });

  it('ignores realtime payload when row is missing', async () => {
    auth.state.session = { user: { id: 'u-99' } };
    const row = { ...testSubscription(), user_id: 'u-99' };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('subid').textContent).toBe('sub_1');
    });
    db.maybeSingle.mockClear();
    db.subscriptionRealtime.handler?.({ new: undefined, old: undefined });
    await Promise.resolve();
    expect(db.maybeSingle).not.toHaveBeenCalled();
  });

  it('polls subscription refresh after checkout success', async () => {
    vi.useFakeTimers();
    const realLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, search: '?checkout=success' },
    });
    auth.state.session = { user: { id: 'u-checkout' } };
    db.maybeSingle.mockResolvedValue({
      data: { ...testSubscription(), user_id: 'u-checkout' },
      error: null,
    });
    try {
      await act(async () => {
        render(
          <BillingProvider config={testBillingConfig} {...providerProps}>
            <Reader />
          </BillingProvider>
        );
      });
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(screen.getByTestId('uid').textContent).toBe('u-checkout');
      const callsAfterMount = db.maybeSingle.mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(db.maybeSingle.mock.calls.length).toBeGreaterThan(callsAfterMount);
    } finally {
      vi.useRealTimers();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: realLocation,
      });
    }
  });

  it('ignores checkout polling when query param is not success', async () => {
    const realLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, search: '?checkout=cancelled' },
    });
    auth.state.session = { user: { id: 'u-no-poll' } };
    db.maybeSingle.mockResolvedValue({
      data: { ...testSubscription(), user_id: 'u-no-poll' },
      error: null,
    });
    try {
      render(
        <BillingProvider config={testBillingConfig} {...providerProps}>
          <Reader />
        </BillingProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('uid').textContent).toBe('u-no-poll');
      });
      const callsAfterMount = db.maybeSingle.mock.calls.length;
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(db.maybeSingle.mock.calls.length).toBe(callsAfterMount);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: realLocation,
      });
    }
  });

  it('stops checkout polling after max attempts', async () => {
    vi.useFakeTimers();
    const realLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, search: '?checkout=success' },
    });
    auth.state.session = { user: { id: 'u-max-poll' } };
    db.maybeSingle.mockResolvedValue({
      data: { ...testSubscription(), user_id: 'u-max-poll' },
      error: null,
    });
    try {
      await act(async () => {
        render(
          <BillingProvider config={testBillingConfig} {...providerProps}>
            <Reader />
          </BillingProvider>
        );
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000 * 21);
      });
      const callCount = db.maybeSingle.mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(db.maybeSingle.mock.calls.length).toBe(callCount);
    } finally {
      vi.useRealTimers();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: realLocation,
      });
    }
  });

  it('ignores auth session result after unmount', async () => {
    let resolveSession: (value: {
      data: { session: { user: { id: string } } | null };
    }) => void = () => {};
    auth.getSession.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveSession = resolve;
        })
    );
    const { unmount } = render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    unmount();
    resolveSession({ data: { session: { user: { id: 'late-user' } } } });
    await Promise.resolve();
    expect(db.maybeSingle).not.toHaveBeenCalled();
  });

  it('ignores plan query result after unmount', async () => {
    let resolvePlan: (value: {
      data: ReturnType<typeof testPlan> | null;
      error: null;
    }) => void = () => {};
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.state.session = { user: { id: 'u-plan-unmount' } };
    const row = {
      ...testSubscription(),
      user_id: 'u-plan-unmount',
      plan_id: 'plan_free',
    };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    db.planMaybeSingle.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolvePlan = resolve;
        })
    );
    const { unmount } = render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <PlanReader />
      </BillingProvider>
    );
    await waitFor(() => expect(db.planMaybeSingle).toHaveBeenCalled());
    unmount();
    resolvePlan({ data: testPlan({ display_name: 'Late plan' }), error: null });
    await act(async () => {
      await Promise.resolve();
    });

    const unmountedWarnings = consoleSpy.mock.calls.filter(([message]) =>
      String(message).toLowerCase().includes('unmounted')
    );
    expect(unmountedWarnings).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('ignores ensure_billing_subscription result after unmount', async () => {
    let resolveRpc: (value: { error: null }) => void = () => {};
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.state.session = { user: { id: 'u-rpc-unmount' } };
    db.rpc.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveRpc = resolve;
        })
    );
    const { unmount } = render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('uid').textContent).toBe('u-rpc-unmount')
    );
    await waitFor(() => expect(db.rpc).toHaveBeenCalled());
    unmount();
    resolveRpc({ error: null });
    await act(async () => {
      await Promise.resolve();
    });

    const unmountedWarnings = consoleSpy.mock.calls.filter(([message]) =>
      String(message).toLowerCase().includes('unmounted')
    );
    expect(unmountedWarnings).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('ignores plan query errors after unmount', async () => {
    let rejectPlan: (error: Error) => void = () => {};
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.state.session = { user: { id: 'u-plan-err-unmount' } };
    const row = {
      ...testSubscription(),
      user_id: 'u-plan-err-unmount',
      plan_id: 'plan_free',
    };
    db.maybeSingle.mockResolvedValue({ data: row, error: null });
    db.planMaybeSingle.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectPlan = reject;
        })
    );
    const { unmount } = render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <PlanReader />
      </BillingProvider>
    );
    await waitFor(() => expect(db.planMaybeSingle).toHaveBeenCalled());
    unmount();
    rejectPlan(new Error('late plan fail'));
    await act(async () => {
      await Promise.resolve();
    });

    const unmountedWarnings = consoleSpy.mock.calls.filter(([message]) =>
      String(message).toLowerCase().includes('unmounted')
    );
    expect(unmountedWarnings).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('ignores ensure_billing_subscription errors after unmount', async () => {
    let rejectRpc: (error: Error) => void = () => {};
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.state.session = { user: { id: 'u-rpc-err-unmount' } };
    db.rpc.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRpc = reject;
        })
    );
    const { unmount } = render(
      <BillingProvider config={testBillingConfig} {...providerProps}>
        <Reader />
      </BillingProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('uid').textContent).toBe('u-rpc-err-unmount')
    );
    await waitFor(() => expect(db.rpc).toHaveBeenCalled());
    unmount();
    rejectRpc(new Error('late rpc fail'));
    await act(async () => {
      await Promise.resolve();
    });

    const unmountedWarnings = consoleSpy.mock.calls.filter(([message]) =>
      String(message).toLowerCase().includes('unmounted')
    );
    expect(unmountedWarnings).toHaveLength(0);
    consoleSpy.mockRestore();
  });
});

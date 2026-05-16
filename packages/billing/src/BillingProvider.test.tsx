import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { ZodError } from 'zod';
import { BillingProvider } from './BillingProvider.js';
import { useBillingContext } from './hooks/useBillingContext.js';
import { productBillingConfigSchema } from './schema.js';
import { testBillingConfig, testSubscription } from './test/billingFixtures.js';

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
  const subChain = {
    select: vi.fn(() => subChain),
    eq: vi.fn(() => subChain),
    maybeSingle,
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
    throw new Error(`unexpected table ${table}`);
  });
  return {
    maybeSingle,
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
});

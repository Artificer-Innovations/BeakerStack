import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionDetail } from '../CollectionDetail';
import type { DemoCollectionRow } from '@/billing/useDemoCollections';

const hp = vi.hoisted(() => ({
  usageExceeded: false,
  usageLoading: false,
  refreshUsage: vi.fn().mockResolvedValue(undefined),
  maxItemsValue: 3 as number | boolean | null,
  featLoading: false,
  featureAEnabled: false,
  featureBEnabled: false,
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useBillingContext: () => ({ config: { productId: 'beakerstack' } }),
    useUsage: () => ({
      exceeded: hp.usageExceeded,
      loading: hp.usageLoading,
      refresh: hp.refreshUsage,
    }),
    useFeature: (key: string) => {
      if (key === 'items_per_container_max') {
        return {
          value: hp.maxItemsValue,
          enabled: true,
          loading: hp.featLoading,
          error: null,
        };
      }
      if (key === 'feature_a') {
        return {
          value: hp.featureAEnabled,
          enabled: hp.featureAEnabled,
          loading: false,
          error: null,
        };
      }
      if (key === 'feature_b') {
        return {
          value: hp.featureBEnabled,
          enabled: hp.featureBEnabled,
          loading: false,
          error: null,
        };
      }
      return { value: null, enabled: false, loading: false, error: null };
    },
  };
});

const mockRpc = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {},
  supabaseRpc: { rpc: mockRpc },
}));

vi.mock('@/lib/fakeAi', () => ({
  nextFakeAiSummary: () => 'Fake AI summary text',
}));

const makeCollection = (
  over: Partial<DemoCollectionRow> = {}
): DemoCollectionRow => ({
  id: 'col-abc',
  item_count: 2,
  ...over,
});

const onActivity = vi.fn();
const addItem = vi.fn();

function renderDetail(collection?: DemoCollectionRow) {
  return render(
    <CollectionDetail
      collection={collection}
      addItem={addItem}
      onActivity={onActivity}
    />
  );
}

describe('CollectionDetail', () => {
  beforeEach(() => {
    hp.usageExceeded = false;
    hp.usageLoading = false;
    hp.refreshUsage.mockClear().mockResolvedValue(undefined);
    hp.maxItemsValue = 3;
    hp.featLoading = false;
    hp.featureAEnabled = false;
    hp.featureBEnabled = false;
    mockRpc.mockReset().mockResolvedValue({ error: null });
    onActivity.mockClear();
    addItem.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows empty state when no collection is selected', () => {
    renderDetail(undefined);
    expect(screen.getByText(/select a collection above/i)).toBeInTheDocument();
  });

  it('renders item list when collection has items', () => {
    renderDetail(makeCollection({ item_count: 2 }));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('shows "No items yet" when item_count is 0', () => {
    renderDetail(makeCollection({ item_count: 0 }));
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });

  it('shows loading ellipsis in item cap subtitle when feature is loading', () => {
    hp.featLoading = true;
    renderDetail(makeCollection());
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('disables summarize while usage is loading', () => {
    hp.usageLoading = true;
    renderDetail(makeCollection({ item_count: 1 }));
    expect(screen.getByRole('button', { name: /summarize/i })).toBeDisabled();
  });

  it('allows add item when plan has unlimited item cap (-1)', () => {
    hp.maxItemsValue = -1;
    renderDetail(makeCollection({ item_count: 99 }));
    expect(screen.getByRole('button', { name: /add item/i })).toBeEnabled();
  });

  it('add item error: shows generic message for non-Error rejections', async () => {
    const user = userEvent.setup();
    addItem.mockRejectedValue('nope');
    renderDetail(makeCollection({ item_count: 1 }));

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Action failed.')
    );
  });

  it('summarize failure: surfaces RPC error object message', async () => {
    const user = userEvent.setup();
    mockRpc.mockResolvedValue({ error: { message: 'Quota exceeded' } });
    renderDetail(makeCollection({ item_count: 1 }));

    await user.click(screen.getAllByRole('button', { name: /summarize/i })[0]);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Quota exceeded')
    );
  });

  it('summarize success: calls RPC, refreshes usage, shows summary, fires onActivity', async () => {
    const user = userEvent.setup();
    renderDetail(makeCollection({ item_count: 1 }));

    const btn = screen.getAllByRole('button', { name: /summarize/i })[0];
    await user.click(btn);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        'billing_record_usage_event',
        expect.objectContaining({
          p_product_id: 'beakerstack',
          p_event_type: 'ai_summarize',
          p_quantity: 1,
        })
      );
    });
    await waitFor(() => {
      expect(hp.refreshUsage).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('Fake AI summary text')).toBeInTheDocument();
    });
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_record_usage_event' })
    );
  });

  it('summarize failure: shows error and retains idempotency key on retry', async () => {
    const user = userEvent.setup();
    mockRpc.mockRejectedValue(new Error('RPC failed'));

    const uuidSpy = vi.spyOn(crypto, 'randomUUID');
    uuidSpy
      .mockReturnValueOnce('key-first' as ReturnType<typeof crypto.randomUUID>)
      .mockReturnValueOnce(
        'key-second' as ReturnType<typeof crypto.randomUUID>
      );

    renderDetail(makeCollection({ item_count: 1 }));

    const btn = screen.getAllByRole('button', { name: /summarize/i })[0];
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('RPC failed');
    });

    // Retry: UUID spy would return 'key-second', but the component should reuse 'key-first'
    mockRpc.mockRejectedValue(new Error('RPC failed again'));
    await user.click(screen.getAllByRole('button', { name: /summarize/i })[0]);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenLastCalledWith(
        'billing_record_usage_event',
        expect.objectContaining({ p_idempotency_key: 'key-first' })
      );
    });
  });

  it('summarize success: clears idempotency key so next call gets a fresh UUID', async () => {
    const user = userEvent.setup();
    const uuidSpy = vi.spyOn(crypto, 'randomUUID');
    uuidSpy
      .mockReturnValueOnce('key-a' as ReturnType<typeof crypto.randomUUID>)
      .mockReturnValueOnce('key-b' as ReturnType<typeof crypto.randomUUID>);

    renderDetail(makeCollection({ item_count: 1 }));

    const btn = () => screen.getAllByRole('button', { name: /summarize/i })[0];
    await user.click(btn());
    await waitFor(() =>
      expect(screen.getByText('Fake AI summary text')).toBeInTheDocument()
    );

    // Second call should use the second UUID (key-b), not the cleared key-a
    await user.click(btn());
    await waitFor(() => {
      expect(mockRpc).toHaveBeenLastCalledWith(
        'billing_record_usage_event',
        expect.objectContaining({ p_idempotency_key: 'key-b' })
      );
    });
  });

  it('disables all summarize buttons when usageExceeded', () => {
    hp.usageExceeded = true;
    renderDetail(makeCollection({ item_count: 2 }));
    const buttons = screen.getAllByRole('button', { name: /limit reached/i });
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });

  it('disables other summarize buttons while one is in flight', async () => {
    const user = userEvent.setup();
    let resolveRpc!: (v: { error: null }) => void;
    mockRpc.mockReturnValue(
      new Promise(res => {
        resolveRpc = res;
      })
    );

    renderDetail(makeCollection({ item_count: 2 }));

    await user.click(screen.getAllByRole('button', { name: /summarize/i })[0]);

    // While the first is in-flight, the second should be disabled
    const allBtns = screen.getAllByRole('button', { name: /summarize|…/i });
    const nonBusy = allBtns.filter(b => !b.textContent?.includes('…'));
    nonBusy.forEach(btn => expect(btn).toBeDisabled());

    // Clicking the disabled button must not trigger a second RPC call —
    // this is the contract the inFlightRef guard enforces.
    if (nonBusy[0]) {
      await user.click(nonBusy[0]);
    }
    expect(mockRpc).toHaveBeenCalledTimes(1);

    resolveRpc({ error: null });
  });

  it('resets summaries when collection changes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDetail(
      makeCollection({ id: 'col-1', item_count: 1 })
    );

    await user.click(screen.getAllByRole('button', { name: /summarize/i })[0]);
    await waitFor(() =>
      expect(screen.getByText('Fake AI summary text')).toBeInTheDocument()
    );

    // Switch to a different collection
    rerender(
      <CollectionDetail
        collection={makeCollection({ id: 'col-2', item_count: 1 })}
        addItem={addItem}
        onActivity={onActivity}
      />
    );

    expect(screen.queryByText('Fake AI summary text')).not.toBeInTheDocument();
  });

  it('add item: calls addItem and fires onActivity', async () => {
    const user = userEvent.setup();
    renderDetail(makeCollection({ item_count: 1 }));

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith('col-abc'));
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_demo_add_item' })
    );
  });

  it('add item button disabled when at item cap', () => {
    hp.maxItemsValue = 2;
    renderDetail(makeCollection({ item_count: 2 }));
    expect(
      screen.getByRole('button', { name: /item limit reached/i })
    ).toBeDisabled();
  });

  it('shows feature toast when feature_a is enabled and clicked', async () => {
    const user = userEvent.setup();
    hp.featureAEnabled = true;
    renderDetail(makeCollection());

    await user.click(screen.getByRole('button', { name: /feature a/i }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Feature A action triggered'
    );
  });

  it('shows upgrade toast when feature_a is disabled and clicked', async () => {
    const user = userEvent.setup();
    hp.featureAEnabled = false;
    renderDetail(makeCollection());

    await user.click(screen.getByRole('button', { name: /feature a/i }));
    expect(screen.getByRole('status')).toHaveTextContent(
      /feature a requires pro/i
    );
  });

  it('shows feature toast when feature_b is enabled and clicked', async () => {
    const user = userEvent.setup();
    hp.featureBEnabled = true;
    renderDetail(makeCollection());

    await user.click(screen.getByRole('button', { name: /feature b/i }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Feature B action triggered'
    );
  });

  it('shows upgrade toast when feature_b is disabled and clicked', async () => {
    const user = userEvent.setup();
    hp.featureBEnabled = false;
    renderDetail(makeCollection());

    await user.click(screen.getByRole('button', { name: /feature b/i }));
    expect(screen.getByRole('status')).toHaveTextContent(
      /feature b requires max/i
    );
  });

  it('add item error: shows addErr alert when addItem rejects', async () => {
    const user = userEvent.setup();
    addItem.mockRejectedValue(new Error('Insert failed'));
    renderDetail(makeCollection({ item_count: 1 }));

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Insert failed')
    );
  });
});

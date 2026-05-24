import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useBillingContext, useFeature, useUsage } from '@beakerstack/billing';
import { CollectionDetail } from '../CollectionDetail';
import type { DemoCollectionRow } from '../../../billing/useDemoCollections';
import { supabase } from '../../../../../apps/mobile/src/lib/supabase';
import { randomUuid } from '../../../../../apps/mobile/src/lib/randomUuid';

jest.mock('@beakerstack/billing', () => ({
  mapUnknownError: (e: unknown) => ({
    kind: 'unknown' as const,
    message:
      e instanceof Error
        ? e.message
        : e &&
            typeof e === 'object' &&
            'message' in e &&
            typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : String(e),
  }),
  defineBillingConfig: (c: unknown) => c,
  useBillingContext: jest.fn(),
  useUsage: jest.fn(),
  useFeature: jest.fn(),
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

type RpcResult = { data: unknown; error: { message: string } | null };

jest.mock('../../../lib/fakeAi', () => ({
  nextFakeAiSummary: () => 'Fake AI summary text',
}));

jest.mock('../../../lib/randomUuid', () => ({
  randomUuid: jest.fn(),
}));

const mockUseBillingContext = jest.mocked(useBillingContext);
const mockUseUsage = jest.mocked(useUsage);
const mockUseFeature = jest.mocked(useFeature);
const mockRpc = supabase.rpc as unknown as jest.MockedFunction<
  (...args: unknown[]) => Promise<RpcResult>
>;
const mockRandomUuid = jest.mocked(randomUuid);

const hp = {
  usageExceeded: false,
  usageLoading: false,
  refreshUsage: jest.fn().mockResolvedValue(undefined),
  maxItemsValue: 3 as number | boolean | null,
  featLoading: false,
  featureAEnabled: false,
  featureALoading: false,
  featureBEnabled: false,
  featureBLoading: false,
};

function applyFeatureMock(key: string) {
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
      loading: hp.featureALoading,
      error: null,
    };
  }
  if (key === 'feature_b') {
    return {
      value: hp.featureBEnabled,
      enabled: hp.featureBEnabled,
      loading: hp.featureBLoading,
      error: null,
    };
  }
  return { value: null, enabled: false, loading: false, error: null };
}

const makeCollection = (
  over: Partial<DemoCollectionRow> = {}
): DemoCollectionRow => ({
  id: 'col-abc',
  item_count: 2,
  ...over,
});

const onActivity = jest.fn();
const addItem = jest.fn();

function renderDetail(collection?: DemoCollectionRow, activity = onActivity) {
  return render(
    <CollectionDetail
      collection={collection}
      addItem={addItem}
      onActivity={activity}
    />
  );
}

function setupMocks() {
  mockUseBillingContext.mockReturnValue({
    config: { productId: 'beakerstack' },
  } as ReturnType<typeof useBillingContext>);

  mockUseUsage.mockImplementation(
    () =>
      ({
        used: 0,
        limit: 30,
        remaining: 30,
        resetsAt: '',
        exceeded: hp.usageExceeded,
        loading: hp.usageLoading,
        error: null,
        refresh: hp.refreshUsage,
      }) as ReturnType<typeof useUsage>
  );

  mockUseFeature.mockImplementation((key: string) => applyFeatureMock(key));
}

describe('CollectionDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hp.usageExceeded = false;
    hp.usageLoading = false;
    hp.refreshUsage.mockClear().mockResolvedValue(undefined);
    hp.maxItemsValue = 3;
    hp.featLoading = false;
    hp.featureAEnabled = false;
    hp.featureALoading = false;
    hp.featureBEnabled = false;
    hp.featureBLoading = false;
    mockRpc.mockReset().mockResolvedValue({ data: null, error: null });
    mockRandomUuid.mockReset();
    onActivity.mockClear();
    addItem.mockReset().mockResolvedValue(undefined);
    setupMocks();
  });

  it('shows empty state when no collection is selected', () => {
    const { getByText } = renderDetail(undefined);
    expect(getByText(/select a collection above/i)).toBeTruthy();
  });

  it('renders item list when collection has items', () => {
    const { getByText } = renderDetail(makeCollection({ item_count: 2 }));
    expect(getByText('Item 1')).toBeTruthy();
    expect(getByText('Item 2')).toBeTruthy();
  });

  it('shows "No items yet" when item_count is 0', () => {
    const { getByText } = renderDetail(makeCollection({ item_count: 0 }));
    expect(getByText(/no items yet/i)).toBeTruthy();
  });

  it('shows loading ellipsis in item cap subtitle when feature is loading', () => {
    hp.featLoading = true;
    const { getByText } = renderDetail(makeCollection());
    expect(getByText('…')).toBeTruthy();
  });

  it('shows unknown cap label when max items feature is not numeric', () => {
    hp.maxItemsValue = true;
    const { getByText } = renderDetail(makeCollection({ item_count: 1 }));
    expect(getByText('1 of … in this collection')).toBeTruthy();
  });

  it('replaces an existing feature toast when another feature is clicked', () => {
    hp.featureAEnabled = true;
    hp.featureBEnabled = true;
    const { getByText, queryByText } = renderDetail(makeCollection());
    fireEvent.press(getByText('Feature A'));
    expect(getByText('Feature A action triggered')).toBeTruthy();
    fireEvent.press(getByText('Feature B'));
    expect(queryByText('Feature A action triggered')).toBeNull();
    expect(getByText('Feature B action triggered')).toBeTruthy();
  });

  it('summarize success: calls RPC, refreshes usage, shows summary, fires onActivity', async () => {
    mockRandomUuid.mockReturnValue('key-first');
    const { getByLabelText, getByText } = renderDetail(
      makeCollection({ item_count: 1 })
    );

    fireEvent.press(getByLabelText('Summarize'));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('billing_record_usage_event', {
        p_product_id: 'beakerstack',
        p_event_type: 'ai_summarize',
        p_quantity: 1,
        p_metadata: {},
        p_idempotency_key: 'key-first',
      });
    });
    await waitFor(() => expect(hp.refreshUsage).toHaveBeenCalled());
    await waitFor(() => expect(getByText('Fake AI summary text')).toBeTruthy());
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_record_usage_event' })
    );
  });

  it('summarize failure: shows error and retains idempotency key on retry', async () => {
    mockRandomUuid
      .mockReturnValueOnce('key-first')
      .mockReturnValueOnce('key-second');
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC failed' },
    });

    const { getByLabelText, getByText } = renderDetail(
      makeCollection({ item_count: 1 })
    );
    fireEvent.press(getByLabelText('Summarize'));

    await waitFor(() => {
      expect(getByText('RPC failed')).toBeTruthy();
    });

    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC failed again' },
    });
    fireEvent.press(getByLabelText('Summarize'));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenLastCalledWith(
        'billing_record_usage_event',
        expect.objectContaining({ p_idempotency_key: 'key-first' })
      );
    });
  });

  it('summarize success: clears idempotency key so next call gets a fresh UUID', async () => {
    mockRandomUuid.mockReturnValueOnce('key-a').mockReturnValueOnce('key-b');

    const { getByLabelText, getByText } = renderDetail(
      makeCollection({ item_count: 1 })
    );
    fireEvent.press(getByLabelText('Summarize'));
    await waitFor(() => expect(getByText('Fake AI summary text')).toBeTruthy());

    fireEvent.press(getByLabelText('Summarize'));
    await waitFor(() => {
      expect(mockRpc).toHaveBeenLastCalledWith(
        'billing_record_usage_event',
        expect.objectContaining({ p_idempotency_key: 'key-b' })
      );
    });
  });

  it('disables summarize when usageExceeded', () => {
    hp.usageExceeded = true;
    const { getAllByLabelText } = renderDetail(
      makeCollection({ item_count: 2 })
    );
    getAllByLabelText('AI summarize limit reached').forEach(btn => {
      expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBe(
        true
      );
    });
  });

  it('disables other summarize buttons while one is in flight', async () => {
    let resolveRpc!: (v: { data: null; error: null }) => void;
    mockRpc.mockImplementation(
      () =>
        new Promise(res => {
          resolveRpc = res;
        })
    );

    const { getAllByLabelText } = renderDetail(
      makeCollection({ item_count: 2 })
    );
    fireEvent.press(getAllByLabelText('Summarize')[0]);

    await waitFor(() => {
      expect(
        getAllByLabelText('Another item is being summarized')[0].props
          .accessibilityState
      ).toEqual(expect.objectContaining({ disabled: true }));
    });

    fireEvent.press(getAllByLabelText('Another item is being summarized')[0]);
    expect(mockRpc).toHaveBeenCalledTimes(1);

    resolveRpc({ data: null, error: null });
  });

  it('resets summaries when collection changes', async () => {
    mockRandomUuid.mockReturnValue('key-1');
    const { getByLabelText, getByText, rerender } = renderDetail(
      makeCollection({ id: 'col-1', item_count: 1 })
    );

    fireEvent.press(getByLabelText('Summarize'));
    await waitFor(() => expect(getByText('Fake AI summary text')).toBeTruthy());

    rerender(
      <CollectionDetail
        collection={makeCollection({ id: 'col-2', item_count: 1 })}
        addItem={addItem}
        onActivity={onActivity}
      />
    );

    expect(() => getByText('Fake AI summary text')).toThrow();
  });

  it('add item: calls addItem and fires onActivity', async () => {
    const { getByText } = renderDetail(makeCollection({ item_count: 1 }));
    fireEvent.press(getByText('+ Add item'));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith('col-abc'));
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_demo_add_item' })
    );
  });

  it('add item button shows limit reached and does not call addItem when at cap', () => {
    hp.maxItemsValue = 2;
    const { getByText } = renderDetail(makeCollection({ item_count: 2 }));
    const label = getByText('Item limit reached');
    fireEvent.press(label);
    expect(addItem).not.toHaveBeenCalled();
  });

  it('does not call summarize RPC when usage is exceeded', () => {
    hp.usageExceeded = true;
    const { getAllByLabelText } = renderDetail(
      makeCollection({ item_count: 1 })
    );
    fireEvent.press(getAllByLabelText('AI summarize limit reached')[0]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('allows add item when plan has unlimited item cap (-1)', () => {
    hp.maxItemsValue = -1;
    const { getByText } = renderDetail(makeCollection({ item_count: 99 }));
    expect(getByText('+ Add item').props.accessibilityState?.disabled).not.toBe(
      true
    );
  });

  it('shows feature toast when feature_a is enabled and clicked', () => {
    hp.featureAEnabled = true;
    const { getByText } = renderDetail(makeCollection());
    fireEvent.press(getByText('Feature A'));
    expect(getByText('Feature A action triggered')).toBeTruthy();
  });

  it('shows plan toast when feature_a is disabled and clicked', () => {
    const { getByText } = renderDetail(makeCollection());
    fireEvent.press(getByText('Feature A'));
    expect(
      getByText(
        /Feature A is not enabled on your current plan \(useFeature returns false\)/i
      )
    ).toBeTruthy();
  });

  it('shows feature toast when feature_b is enabled and clicked', () => {
    hp.featureBEnabled = true;
    const { getByText } = renderDetail(makeCollection());
    fireEvent.press(getByText('Feature B'));
    expect(getByText('Feature B action triggered')).toBeTruthy();
  });

  it('shows plan toast when feature_b is disabled and clicked', () => {
    const { getByText } = renderDetail(makeCollection());
    fireEvent.press(getByText('Feature B'));
    expect(
      getByText(
        /Feature B is not enabled on your current plan \(useFeature returns false\)/i
      )
    ).toBeTruthy();
  });

  it('add item error: shows alert when addItem rejects', async () => {
    addItem.mockRejectedValue(new Error('Insert failed'));
    const { getByText } = renderDetail(makeCollection({ item_count: 1 }));
    fireEvent.press(getByText('+ Add item'));
    await waitFor(() => expect(getByText('Insert failed')).toBeTruthy());
  });

  it('add item error: shows generic message for non-Error rejections', async () => {
    addItem.mockRejectedValue('nope');
    const { getByText } = renderDetail(makeCollection({ item_count: 1 }));
    fireEvent.press(getByText('+ Add item'));
    await waitFor(() => expect(getByText('Action failed.')).toBeTruthy());
  });

  it('disables summarize while usage is loading', () => {
    hp.usageLoading = true;
    const { getByLabelText } = renderDetail(makeCollection({ item_count: 1 }));
    expect(getByLabelText('Summarize').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );
  });

  it('clears pending toast timer on unmount', () => {
    jest.useFakeTimers();
    hp.featureAEnabled = true;
    const { getByText, unmount } = renderDetail(makeCollection());
    fireEvent.press(getByText('Feature A'));
    expect(getByText('Feature A action triggered')).toBeTruthy();
    unmount();
    expect(() => jest.runOnlyPendingTimers()).not.toThrow();
    jest.useRealTimers();
  });

  it('works without onActivity callback', async () => {
    mockRandomUuid.mockReturnValue('key-solo');
    const { getByLabelText, getByText } = render(
      <CollectionDetail
        collection={makeCollection({ item_count: 1 })}
        addItem={addItem}
      />
    );
    fireEvent.press(getByLabelText('Summarize'));
    await waitFor(() => expect(getByText('Fake AI summary text')).toBeTruthy());
    expect(onActivity).not.toHaveBeenCalled();
  });
});

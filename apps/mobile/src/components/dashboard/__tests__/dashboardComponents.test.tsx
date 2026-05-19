import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useBillingContext, useFeature, useUsage } from '@beakerstack/billing';
import { CollectionsGrid } from '../CollectionsGrid';
import { BooleanFeatureTiles } from '../BooleanFeatureTiles';
import { UsageStrip } from '../UsageStrip';
import { AnnotatedPrimitive } from '../AnnotatedPrimitive';
import type { DemoCollectionRow } from '../../../billing/useDemoCollections';
import { supabase } from '../../../lib/supabase';
import { randomUuid } from '../../../lib/randomUuid';

jest.mock('@beakerstack/billing', () => ({
  defineBillingConfig: (c: unknown) => c,
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
  useBillingContext: jest.fn(),
  useUsage: jest.fn(),
  useFeature: jest.fn(),
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

jest.mock('../../../lib/fakeAi', () => ({
  nextFakeAiSummary: () => 'Fake summary from test',
}));

jest.mock('../../../lib/randomUuid', () => ({
  randomUuid: jest.fn(),
}));

const mockUseBillingContext = jest.mocked(useBillingContext);
const mockUseUsage = jest.mocked(useUsage);
const mockUseFeature = jest.mocked(useFeature);
const mockRpc = jest.mocked(supabase.rpc);
const mockInvoke = jest.mocked(supabase.functions.invoke);
const mockRandomUuid = jest.mocked(randomUuid);

const featureState = {
  containersValue: 2 as number | boolean | null,
  containersLoading: false,
  featureAEnabled: false,
  featureALoading: false,
  featureBEnabled: false,
  featureBLoading: false,
};

const usageState = {
  used: 2,
  limit: 10 as number | null,
  resetsAt: '2026-06-01T00:00:00.000Z' as string | null,
  exceeded: false,
  loading: false,
  error: null as { message: string } | null,
  refresh: jest.fn().mockResolvedValue(undefined),
};

function applyFeatureMock(key: string) {
  if (key === 'containers_per_account_max') {
    return {
      value: featureState.containersValue,
      enabled: true,
      loading: featureState.containersLoading,
      error: null,
    };
  }
  if (key === 'feature_a') {
    return {
      value: featureState.featureAEnabled,
      enabled: featureState.featureAEnabled,
      loading: featureState.featureALoading,
      error: null,
    };
  }
  if (key === 'feature_b') {
    return {
      value: featureState.featureBEnabled,
      enabled: featureState.featureBEnabled,
      loading: featureState.featureBLoading,
      error: null,
    };
  }
  return { value: null, enabled: false, loading: false, error: null };
}

const makeCol = (id: string, item_count = 0): DemoCollectionRow => ({
  id,
  item_count,
});

describe('CollectionsGrid', () => {
  const onSelect = jest.fn();
  const addCollection = jest.fn();
  const deleteCollection = jest.fn();
  const onActivity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    featureState.containersValue = 2;
    featureState.containersLoading = false;
    mockUseFeature.mockImplementation((key: string) => applyFeatureMock(key));
    onSelect.mockClear();
    addCollection.mockReset().mockResolvedValue(undefined);
    deleteCollection.mockReset().mockResolvedValue(undefined);
    onActivity.mockClear();
  });

  function renderGrid(
    collections: DemoCollectionRow[] = [],
    opts: {
      loading?: boolean;
      error?: string | null;
      selectedId?: string | null;
    } = {}
  ) {
    return render(
      <CollectionsGrid
        collections={collections}
        loading={opts.loading ?? false}
        error={opts.error ?? null}
        selectedId={opts.selectedId ?? null}
        onSelect={onSelect}
        addCollection={addCollection}
        deleteCollection={deleteCollection}
        onActivity={onActivity}
      />
    );
  }

  it('shows empty state when there are no collections', () => {
    const { getByText } = renderGrid([]);
    expect(getByText(/no collections yet/i)).toBeTruthy();
  });

  it('shows loading ellipsis in subtitle', () => {
    const { getByText } = renderGrid([], { loading: true });
    expect(getByText('…')).toBeTruthy();
  });

  it('shows collections error banner', () => {
    const { getByText } = renderGrid([], { error: 'RPC unavailable' });
    expect(getByText(/RPC unavailable/)).toBeTruthy();
    expect(getByText(/demo_billing_mode/i)).toBeTruthy();
  });

  it('calls onSelect when a collection card is pressed', () => {
    const { getByText } = renderGrid([makeCol('col-select-me', 2)]);
    fireEvent.press(getByText('Collection'));
    expect(onSelect).toHaveBeenCalledWith('col-select-me');
  });

  it('marks selected collection with accessibility state', () => {
    const { getByText, UNSAFE_getAllByType } = renderGrid(
      [makeCol('col-sel')],
      {
        selectedId: 'col-sel',
      }
    );
    const { Pressable } = require('react-native');
    const cards = UNSAFE_getAllByType(Pressable).filter(
      (p: { props: { accessibilityState?: { selected?: boolean } } }) =>
        p.props.accessibilityState?.selected === true
    );
    expect(cards.length).toBeGreaterThan(0);
    expect(getByText('col-sel…')).toBeTruthy();
  });

  it('adds collection and fires onActivity', async () => {
    const { getByLabelText } = renderGrid([]);
    fireEvent.press(getByLabelText('New collection'));
    await waitFor(() => expect(addCollection).toHaveBeenCalled());
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_demo_add_collection' })
    );
  });

  it('shows generic action error for non-Error add failures', async () => {
    addCollection.mockRejectedValue('nope');
    const { getByLabelText, getByText } = renderGrid([]);
    fireEvent.press(getByLabelText('New collection'));
    await waitFor(() => expect(getByText('Action failed.')).toBeTruthy());
  });

  it('deletes collection and fires onActivity', async () => {
    const { getByLabelText } = renderGrid([makeCol('col-del')]);
    fireEvent.press(getByLabelText('Delete collection'));
    await waitFor(() =>
      expect(deleteCollection).toHaveBeenCalledWith('col-del')
    );
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_demo_delete_collection' })
    );
  });

  it('shows limit reached when at collection cap', () => {
    featureState.containersValue = 1;
    const { getByText } = renderGrid([makeCol('only-one')]);
    expect(getByText('Limit reached')).toBeTruthy();
  });

  it('shows singular item label when count is 1', () => {
    const { getByText } = renderGrid([makeCol('col-one', 1)]);
    expect(getByText(/1 item$/)).toBeTruthy();
  });

  it('shows unknown cap label when max collections is not numeric', () => {
    featureState.containersValue = true;
    const { getByText } = renderGrid([makeCol('col-a')]);
    expect(getByText('1 of …')).toBeTruthy();
  });

  it('allows add when plan has unlimited collection cap', () => {
    featureState.containersValue = -1;
    const { getByLabelText } = renderGrid(
      Array.from({ length: 5 }, (_, i) => makeCol(`col-${i}`))
    );
    expect(
      getByLabelText('New collection').props.accessibilityState?.disabled
    ).not.toBe(true);
  });
});

describe('BooleanFeatureTiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    featureState.featureAEnabled = false;
    featureState.featureALoading = false;
    featureState.featureBEnabled = false;
    featureState.featureBLoading = false;
    mockUseFeature.mockImplementation((key: string) => applyFeatureMock(key));
  });

  it('shows disabled feature tiles by default', () => {
    const { getAllByText } = render(<BooleanFeatureTiles />);
    expect(getAllByText('✕').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('false').length).toBeGreaterThanOrEqual(2);
  });

  it('shows enabled checkmarks when features are on', () => {
    featureState.featureAEnabled = true;
    featureState.featureBEnabled = true;
    const { getAllByText } = render(<BooleanFeatureTiles />);
    expect(getAllByText('✓').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('true').length).toBeGreaterThanOrEqual(2);
  });

  it('shows loading placeholders while feature hooks load', () => {
    featureState.featureALoading = true;
    featureState.featureBLoading = true;
    const { getAllByText } = render(<BooleanFeatureTiles />);
    expect(getAllByText('…').length).toBeGreaterThanOrEqual(2);
  });
});

describe('UsageStrip', () => {
  const onActivity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    usageState.used = 2;
    usageState.limit = 10;
    usageState.resetsAt = '2026-06-01T00:00:00.000Z';
    usageState.exceeded = false;
    usageState.loading = false;
    usageState.error = null;
    usageState.refresh.mockClear().mockResolvedValue(undefined);
    mockUseBillingContext.mockReturnValue({
      config: { productId: 'beakerstack' },
    } as ReturnType<typeof useBillingContext>);
    mockUseUsage.mockImplementation(
      () =>
        ({
          used: usageState.used,
          limit: usageState.limit,
          remaining:
            usageState.limit != null
              ? Math.max(0, usageState.limit - usageState.used)
              : null,
          resetsAt: usageState.resetsAt,
          exceeded: usageState.exceeded,
          loading: usageState.loading,
          error: usageState.error,
          refresh: usageState.refresh,
        }) as ReturnType<typeof useUsage>
    );
    mockRpc.mockReset().mockResolvedValue({ data: null, error: null });
    mockInvoke.mockReset().mockResolvedValue({ data: null, error: null });
    mockRandomUuid.mockReturnValue('usage-key-1');
    onActivity.mockClear();
    process.env.EXPO_PUBLIC_DEMO_USE_REAL_AI = '';
  });

  it('shows loading placeholder in cap line', () => {
    usageState.loading = true;
    const { getByText } = render(<UsageStrip />);
    expect(getByText('…')).toBeTruthy();
  });

  it('shows unlimited usage copy when limit is null', () => {
    usageState.limit = null;
    const { getByText } = render(<UsageStrip />);
    expect(getByText(/unlimited/i)).toBeTruthy();
  });

  it('shows em dash when resetsAt is missing', () => {
    usageState.resetsAt = null;
    const { getByText } = render(<UsageStrip />);
    expect(getByText(/resets —/)).toBeTruthy();
  });

  it('shows limit reached UI when exceeded', () => {
    usageState.exceeded = true;
    const { getByText, queryByText } = render(<UsageStrip />);
    expect(getByText('Limit reached')).toBeTruthy();
    expect(getByText(/Monthly limit reached/i)).toBeTruthy();
    expect(queryByText('Simulate AI summarize')).toBeNull();
  });

  it('shows usage hook error', () => {
    usageState.error = { message: 'Usage unavailable' };
    const { getByText } = render(<UsageStrip />);
    expect(getByText('Usage unavailable')).toBeTruthy();
  });

  it('records usage, shows result, and fires onActivity', async () => {
    const { getByText } = render(<UsageStrip onActivity={onActivity} />);
    fireEvent.press(getByText('Simulate AI summarize'));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        'billing_record_usage_event',
        expect.objectContaining({
          p_idempotency_key: 'usage-key-1',
        })
      );
    });
    await waitFor(() =>
      expect(getByText('Fake summary from test')).toBeTruthy()
    );
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_record_usage_event' })
    );
  });

  it('retains idempotency key on RPC failure then retry', async () => {
    mockRandomUuid
      .mockReturnValueOnce('retry-key')
      .mockReturnValueOnce('new-key');
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'cap exceeded' } })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'cap exceeded' },
      });

    const { getByText } = render(<UsageStrip />);
    fireEvent.press(getByText('Simulate AI summarize'));
    await waitFor(() => expect(getByText('cap exceeded')).toBeTruthy());

    fireEvent.press(getByText('Simulate AI summarize'));
    await waitFor(() => {
      expect(mockRpc).toHaveBeenLastCalledWith(
        'billing_record_usage_event',
        expect.objectContaining({ p_idempotency_key: 'retry-key' })
      );
    });
  });

  it('uses edge function text when EXPO_PUBLIC_DEMO_USE_REAL_AI is true', async () => {
    process.env.EXPO_PUBLIC_DEMO_USE_REAL_AI = 'true';
    mockInvoke.mockResolvedValue({
      data: { text: '  Edge summary  ' },
      error: null,
    });

    const { getByText } = render(<UsageStrip />);
    fireEvent.press(getByText('Simulate AI summarize'));

    await waitFor(() => expect(getByText('Edge summary')).toBeTruthy());
  });

  it('falls back to fake AI when edge function invoke throws', async () => {
    process.env.EXPO_PUBLIC_DEMO_USE_REAL_AI = 'true';
    mockInvoke.mockRejectedValue(new Error('offline'));

    const { getByText } = render(<UsageStrip />);
    fireEvent.press(getByText('Simulate AI summarize'));

    await waitFor(() =>
      expect(getByText('Fake summary from test')).toBeTruthy()
    );
  });

  it('falls back when edge function returns an error object', async () => {
    process.env.EXPO_PUBLIC_DEMO_USE_REAL_AI = 'true';
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'function error' },
    });

    const { getByText } = render(<UsageStrip />);
    fireEvent.press(getByText('Simulate AI summarize'));

    await waitFor(() =>
      expect(getByText('Fake summary from test')).toBeTruthy()
    );
  });
});

describe('AnnotatedPrimitive', () => {
  it('renders tag without tooltip', () => {
    const { getByText, queryByText } = render(
      <AnnotatedPrimitive tag='useUsage' variant='usage'>
        <Text>Child</Text>
      </AnnotatedPrimitive>
    );
    expect(getByText('useUsage')).toBeTruthy();
    expect(getByText('Child')).toBeTruthy();
    expect(queryByText(/—/)).toBeNull();
  });

  it('renders tooltip and sets accessibility hint', () => {
    const { getByText, getByLabelText } = render(
      <AnnotatedPrimitive
        tag='useFeature'
        variant='gate'
        tooltip='Gate explanation'
      >
        <View>
          <Text>Inner</Text>
        </View>
      </AnnotatedPrimitive>
    );
    expect(getByText('Gate explanation')).toBeTruthy();
    expect(getByLabelText('useFeature').props.accessibilityHint).toBe(
      'useFeature — Gate explanation'
    );
  });

  it('supports feature variant styling', () => {
    const { getByText } = render(
      <AnnotatedPrimitive tag='feature cap' variant='feature'>
        <Text>Cap block</Text>
      </AnnotatedPrimitive>
    );
    expect(getByText('feature cap')).toBeTruthy();
    expect(getByText('Cap block')).toBeTruthy();
  });
});

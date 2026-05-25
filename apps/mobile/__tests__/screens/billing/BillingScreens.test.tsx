import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { BillingUiStateKind, SubscriptionRow } from '@beakerstack/billing';
import {
  useBillingState,
  usePlan,
  usePlanCatalog,
  useUsage,
} from '@beakerstack/billing';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { BillingOverviewScreen } from '../../../src/screens/billing/BillingOverviewScreen';
import { BillingUsageScreen } from '../../../src/screens/billing/BillingUsageScreen';
import { useDemoCollectionCount } from '@adopter/mobile/billing/useDemoCollectionCount';
import { branding } from '@adopter/config/branding';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      getParent: () => null,
    }),
    useRoute: () => ({ name: 'BillingOverview' }),
  };
});

jest.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('@adopter/mobile/billing/useDemoCollectionCount', () => ({
  useDemoCollectionCount: jest.fn(),
}));

jest.mock('@beakerstack/billing/presentation', () => ({
  formatMonthYear: () => 'Jan 2024',
  formatDate: (d: string) => d,
  mergePlanFeatureRows: (config: {
    planFeatureRows?: {
      id: string;
      featureKey: string;
      kind: string;
      label: string;
    }[];
  }) => config.planFeatureRows ?? [],
  mergeUsageLimitsCopy: (config: {
    usageLimitsCopy?: Record<string, string>;
  }) => config.usageLimitsCopy ?? {},
  mergeUsageMeterCopy: (config: {
    usageMeterCopy?: Record<string, { label: string; description?: string }>;
  }) => config.usageMeterCopy ?? {},
  planFeatureLine: (
    plan: { features: Record<string, unknown> },
    row: { label: string; featureKey: string }
  ) => ({
    ok: !!plan.features[row.featureKey],
    text: row.label,
  }),
}));

jest.mock('@beakerstack/billing', () => ({
  defineBillingConfig: (c: unknown) => c,
  useBillingState: jest.fn(),
  usePlan: jest.fn(),
  usePlanCatalog: jest.fn(),
  useUsage: jest.fn(),
  useBillingConfig: jest.fn(() => ({
    productId: 'beakerstack',
    planFeatureRows: [
      {
        id: 'feature_a',
        featureKey: 'feature_a',
        kind: 'boolean',
        label: 'Feature A',
      },
    ],
    usageMeterCopy: {
      ai_summarize: { label: 'AI summarize', description: 'Demo meter' },
    },
    usageLimitsCopy: {
      collectionsRowName: 'Collections',
      itemsRowName: 'Items',
      collectionsFootnote: 'Demo footnote',
    },
  })),
}));

jest.mock('@beakerstack/billing/native', () => {
  const { Text, View } = require('react-native');
  return {
    UsageIndicator: ({ label }: { label?: string }) => (
      <Text>{label ?? 'meter'}</Text>
    ),
    FeatureCheckIcon: () => <View />,
    FeatureXIcon: () => <View />,
  };
});

jest.mock('@beakerstack/shared/components/navigation/AppHeader.native', () => ({
  AppHeader: () => null,
}));

jest.mock('../../../src/lib/supabase', () => ({
  supabase: {},
}));

const mockUseBillingState = jest.mocked(useBillingState);
const mockUsePlan = jest.mocked(usePlan);
const mockUsePlanCatalog = jest.mocked(usePlanCatalog);
const mockUseUsage = jest.mocked(useUsage);
const mockUseAuthContext = jest.mocked(useAuthContext);
const mockUseDemoCollectionCount = jest.mocked(useDemoCollectionCount);

const freePlan = {
  id: 'beakerstack_free',
  display_name: 'Free',
  features: {
    containers_per_account_max: 2,
    items_per_container_max: 3,
    feature_a: false,
    feature_b: false,
  },
  usage_limits: { ai_summarize: 30 },
};

const proPlan = {
  id: 'beakerstack_pro',
  display_name: 'Pro',
  features: {
    containers_per_account_max: -1,
    items_per_container_max: 25,
    feature_a: true,
    feature_b: false,
  },
  usage_limits: { ai_summarize: 500 },
};

const defaultSubscription: Pick<
  SubscriptionRow,
  | 'status'
  | 'stripe_subscription_id'
  | 'current_period_end'
  | 'pending_target_plan_id'
> = {
  status: 'free',
  stripe_subscription_id: null,
  current_period_end: null,
  pending_target_plan_id: null,
};

function setupOverviewMocks(
  overrides: {
    kind?: BillingUiStateKind;
    subscription?: Partial<typeof defaultSubscription>;
    plan?: typeof freePlan | typeof proPlan | null;
    planLoading?: boolean;
    catalogPlans?: { id: string; display_name: string }[];
    usage?: {
      used?: number;
      limit?: number | null;
      loading?: boolean;
    };
    collections?: {
      count?: number;
      maxItemsInAnyCollection?: number;
      loading?: boolean;
      error?: string | null;
    };
    authUser?: { created_at?: string } | null;
  } = {}
) {
  const {
    kind = 'free',
    subscription = {},
    plan = freePlan,
    planLoading = false,
    catalogPlans = [],
    usage = {},
    collections = {},
    authUser = { created_at: '2024-01-15T00:00:00.000Z' },
  } = overrides;

  mockUseBillingState.mockReturnValue({
    kind,
    subscription: { ...defaultSubscription, ...subscription },
  } as ReturnType<typeof useBillingState>);

  mockUsePlan.mockReturnValue({
    data: plan,
    loading: planLoading,
  } as ReturnType<typeof usePlan>);

  mockUsePlanCatalog.mockReturnValue({
    plans: catalogPlans,
  } as ReturnType<typeof usePlanCatalog>);

  mockUseUsage.mockReturnValue({
    used: usage.used ?? 1,
    limit: usage.limit !== undefined ? usage.limit : 30,
    remaining: 29,
    loading: usage.loading ?? false,
  } as ReturnType<typeof useUsage>);

  mockUseDemoCollectionCount.mockReturnValue({
    count: collections.count ?? 1,
    maxItemsInAnyCollection: collections.maxItemsInAnyCollection ?? 2,
    loading: collections.loading ?? false,
    error: collections.error ?? null,
    refresh: jest.fn(),
  });

  mockUseAuthContext.mockReturnValue({
    user: authUser,
  } as ReturnType<typeof useAuthContext>);
}

function renderWithNav(ui: React.ReactElement) {
  return render(<NavigationContainer>{ui}</NavigationContainer>);
}

describe('BillingOverviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupOverviewMocks();
  });

  it('shows plan name, usage stats, collections cap, and member since', () => {
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText(/You're on the Free plan/)).toBeTruthy();
    expect(getByText(/1 of 30 AI summaries/)).toBeTruthy();
    expect(getByText(/1 of 2/)).toBeTruthy();
    expect(getByText('Jan 2024')).toBeTruthy();
  });

  it('shows payment failed banner', () => {
    setupOverviewMocks({ kind: 'payment_failed' });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText('Payment problem')).toBeTruthy();
    expect(getByText(/Your last payment did not go through/i)).toBeTruthy();
    expect(
      getByText(new RegExp(`${branding.displayName} web app`, 'i'))
    ).toBeTruthy();
  });

  it('shows downgrade pending banner with target plan name from catalog', () => {
    setupOverviewMocks({
      kind: 'downgrade_pending',
      subscription: {
        current_period_end: '2026-07-01T00:00:00.000Z',
        pending_target_plan_id: 'beakerstack_free',
      },
      catalogPlans: [{ id: 'beakerstack_free', display_name: 'Free' }],
    });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText('Plan change scheduled')).toBeTruthy();
    expect(getByText(/You'll be moved to Free on/i)).toBeTruthy();
  });

  it('shows downgrade pending banner with fallback target when catalog has no match', () => {
    setupOverviewMocks({
      kind: 'downgrade_pending',
      subscription: {
        current_period_end: '2026-07-01T00:00:00.000Z',
        pending_target_plan_id: 'beakerstack_unknown',
      },
      catalogPlans: [],
    });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText(/You'll be moved to your next plan on/i)).toBeTruthy();
  });

  it('shows cancelled pending banner', () => {
    setupOverviewMocks({
      kind: 'cancelled_pending',
      subscription: {
        current_period_end: '2026-12-31T00:00:00.000Z',
      },
    });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText('Subscription cancelled')).toBeTruthy();
    expect(getByText(/Your subscription ends on/i)).toBeTruthy();
  });

  it('shows ActivityIndicator when billing and plan are loading', () => {
    setupOverviewMocks({
      kind: 'loading',
      planLoading: true,
      plan: null,
    });
    const { UNSAFE_getByType } = renderWithNav(<BillingOverviewScreen />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('hides overview banners for loading and no_subscription states', () => {
    setupOverviewMocks({ kind: 'loading', planLoading: true, plan: null });
    const loadingTree = renderWithNav(<BillingOverviewScreen />);
    expect(loadingTree.queryByText('Payment problem')).toBeNull();
    expect(loadingTree.queryByText('Plan change scheduled')).toBeNull();

    setupOverviewMocks({ kind: 'no_subscription', plan: null });
    const noSubTree = renderWithNav(<BillingOverviewScreen />);
    expect(noSubTree.queryByText('Subscription cancelled')).toBeNull();
  });

  it('shows unlimited usage copy when meter has no limit', () => {
    setupOverviewMocks({
      usage: { used: 3, limit: null },
    });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText('3 used (unlimited)')).toBeTruthy();
  });

  it('shows em dash for usage while loading', () => {
    setupOverviewMocks({
      usage: { used: 0, limit: 30, loading: true },
    });
    const { getAllByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('shows unlimited collections when plan cap is -1', () => {
    setupOverviewMocks({
      plan: proPlan,
      collections: { count: 4 },
    });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText('4 of unlimited')).toBeTruthy();
  });

  it('shows em dash for collections while loading', () => {
    setupOverviewMocks({
      collections: { count: 0, loading: true },
    });
    const { getAllByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error copy when collections fail to load', () => {
    setupOverviewMocks({
      collections: { count: 0, error: 'db' },
    });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText('Unable to load')).toBeTruthy();
  });

  it('treats missing collection count as zero', () => {
    mockUseDemoCollectionCount.mockReturnValue({
      count: undefined as unknown as number,
      maxItemsInAnyCollection: 0,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText('0 of 2')).toBeTruthy();
  });

  it('shows em dash for member since when user has no created_at', () => {
    setupOverviewMocks({ authUser: {} });
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText('Member since')).toBeTruthy();
    expect(getByText('—')).toBeTruthy();
  });

  it('omits plan card when current plan is unavailable', () => {
    setupOverviewMocks({ plan: null });
    const { queryByText } = renderWithNav(<BillingOverviewScreen />);
    expect(queryByText(/You're on the/)).toBeNull();
  });
});

describe('BillingUsageScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupOverviewMocks();
  });

  it('renders usage meters and boolean plan features from config', () => {
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText('Plan features')).toBeTruthy();
    expect(getByText('AI summarize')).toBeTruthy();
    expect(getByText('Feature A')).toBeTruthy();
    expect(getByText('Not available')).toBeTruthy();
  });

  it('shows loading copy when plan is unavailable', () => {
    setupOverviewMocks({ plan: null });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText('Loading plan…')).toBeTruthy();
  });

  it('shows payment failed banner', () => {
    setupOverviewMocks({ kind: 'payment_failed' });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText(/Payment failed/i)).toBeTruthy();
  });

  it('shows demo collection error banner', () => {
    setupOverviewMocks({
      collections: { error: 'counts failed' },
    });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText(/Could not load demo collection counts/i)).toBeTruthy();
  });

  it('shows free-tier usage reset copy', () => {
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(
      getByText(/start of the next calendar month \(free tier\)/i)
    ).toBeTruthy();
  });

  it('shows paid usage reset copy for active subscriptions', () => {
    setupOverviewMocks({
      subscription: {
        status: 'active',
        stripe_subscription_id: 'sub_active',
      },
    });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText(/next billing date/i)).toBeTruthy();
  });

  it('shows unlimited collections limit row on pro plan', () => {
    setupOverviewMocks({ plan: proPlan });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText('1 of unlimited')).toBeTruthy();
    expect(getByText('2 of 25')).toBeTruthy();
  });

  it('shows available boolean features when enabled on plan', () => {
    setupOverviewMocks({ plan: proPlan });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText('Available')).toBeTruthy();
  });

  it('shows limit usage at collection cap', () => {
    setupOverviewMocks({
      collections: { count: 2, maxItemsInAnyCollection: 1 },
      plan: freePlan,
    });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText('2 of 2')).toBeTruthy();
    expect(getByText('1 of 3')).toBeTruthy();
  });

  it('shows items limit row as unlimited when per-container cap is -1', () => {
    setupOverviewMocks({
      plan: {
        ...proPlan,
        features: {
          ...proPlan.features,
          items_per_container_max: -1,
        },
      },
    });
    const { getAllByText } = renderWithNav(<BillingUsageScreen />);
    expect(getAllByText(/of unlimited/).length).toBeGreaterThanOrEqual(2);
  });

  it('shows near-cap collection usage', () => {
    setupOverviewMocks({
      plan: {
        ...freePlan,
        features: {
          ...freePlan.features,
          containers_per_account_max: 10,
        },
      },
      collections: { count: 8, maxItemsInAnyCollection: 0 },
    });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText('8 of 10')).toBeTruthy();
  });

  it('falls back to meter id when copy is missing', () => {
    setupOverviewMocks({
      plan: {
        ...freePlan,
        usage_limits: {
          ai_summarize: 30,
          custom_meter: 5,
        } as typeof freePlan.usage_limits,
      },
    });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText('custom_meter')).toBeTruthy();
  });

  it('shows free-tier reset copy when subscription id is missing', () => {
    setupOverviewMocks({
      subscription: {
        status: 'active',
        stripe_subscription_id: null,
      },
    });
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(
      getByText(/start of the next calendar month \(free tier\)/i)
    ).toBeTruthy();
  });
});

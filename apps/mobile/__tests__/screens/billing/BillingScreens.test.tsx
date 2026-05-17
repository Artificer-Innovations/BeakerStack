import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { BillingOverviewScreen } from '../../../src/screens/billing/BillingOverviewScreen';
import { BillingUsageScreen } from '../../../src/screens/billing/BillingUsageScreen';

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
  useAuthContext: () => ({
    user: { created_at: '2024-01-15T00:00:00.000Z' },
  }),
}));

jest.mock('../../../src/billing/useDemoCollectionCount', () => ({
  useDemoCollectionCount: () => ({
    count: 1,
    maxItemsInAnyCollection: 2,
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
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
  useBillingState: jest.fn(() => ({
    kind: 'free',
    subscription: { status: 'free', stripe_subscription_id: null },
  })),
  usePlan: jest.fn(() => ({
    data: {
      id: 'beakerstack_free',
      display_name: 'Free',
      features: {
        containers_per_account_max: 2,
        items_per_container_max: 3,
        feature_a: false,
        feature_b: false,
      },
      usage_limits: { ai_summarize: 30 },
    },
    loading: false,
  })),
  usePlanCatalog: jest.fn(() => ({ plans: [] })),
  useUsage: jest.fn(() => ({
    used: 1,
    limit: 30,
    remaining: 29,
    loading: false,
  })),
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

function renderWithNav(ui: React.ReactElement) {
  return render(<NavigationContainer>{ui}</NavigationContainer>);
}

describe('BillingOverviewScreen', () => {
  it('shows plan name and usage stats', () => {
    const { getByText } = renderWithNav(<BillingOverviewScreen />);
    expect(getByText(/You're on the Free plan/)).toBeTruthy();
    expect(getByText(/1 of 30 AI summaries/)).toBeTruthy();
    expect(getByText(/1 of 2/)).toBeTruthy();
  });
});

describe('BillingUsageScreen', () => {
  it('renders usage meters and boolean plan features from config', () => {
    const { getByText } = renderWithNav(<BillingUsageScreen />);
    expect(getByText('Plan features')).toBeTruthy();
    expect(getByText('AI summarize')).toBeTruthy();
    expect(getByText('Feature A')).toBeTruthy();
    expect(getByText('Not available')).toBeTruthy();
  });
});

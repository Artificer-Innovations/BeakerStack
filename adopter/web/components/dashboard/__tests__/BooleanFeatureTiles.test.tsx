import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BooleanFeatureTiles } from '../BooleanFeatureTiles';

const featureState = vi.hoisted(() => ({
  featureAEnabled: false,
  featureALoading: false,
  featureBEnabled: false,
  featureBLoading: false,
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useFeature: (key: string) => {
      if (key === 'feature_a') {
        return {
          enabled: featureState.featureAEnabled,
          loading: featureState.featureALoading,
        };
      }
      if (key === 'feature_b') {
        return {
          enabled: featureState.featureBEnabled,
          loading: featureState.featureBLoading,
        };
      }
      return { enabled: false, loading: false };
    },
  };
});

describe('BooleanFeatureTiles', () => {
  afterEach(() => {
    featureState.featureAEnabled = false;
    featureState.featureALoading = false;
    featureState.featureBEnabled = false;
    featureState.featureBLoading = false;
  });

  it('shows disabled tiles by default', () => {
    render(<BooleanFeatureTiles />);
    expect(screen.getAllByText('false').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Feature A').length).toBeGreaterThanOrEqual(1);
  });

  it('shows enabled checkmarks when features are on', () => {
    featureState.featureAEnabled = true;
    featureState.featureBEnabled = true;
    render(<BooleanFeatureTiles />);
    expect(screen.getAllByText('true').length).toBeGreaterThanOrEqual(2);
  });

  it('shows loading placeholders while feature hooks load', () => {
    featureState.featureALoading = true;
    featureState.featureBLoading = true;
    render(<BooleanFeatureTiles />);
    expect(screen.getAllByText('…').length).toBeGreaterThanOrEqual(2);
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FeatureGate } from './FeatureGate.native.js';
import { useFeature } from '../hooks/useFeature.js';

vi.mock('../hooks/useFeature.js', () => ({ useFeature: vi.fn() }));

describe('FeatureGate (native)', () => {
  beforeEach(() => {
    vi.mocked(useFeature).mockReset();
  });

  it('renders children when enabled', () => {
    vi.mocked(useFeature).mockReturnValue({
      enabled: true,
      value: true,
      loading: false,
      error: null,
    });
    render(
      <FeatureGate feature='feature_x' fallback={<span>no</span>}>
        <span>inside</span>
      </FeatureGate>
    );
    expect(screen.getByText('inside')).toBeInTheDocument();
  });

  it('renders fallback when feature key is missing', () => {
    vi.mocked(useFeature).mockReturnValue({
      enabled: true,
      value: true,
      loading: false,
      error: null,
    });
    render(
      <FeatureGate featureName='' fallback={<span>blocked</span>}>
        <span>inside</span>
      </FeatureGate>
    );
    expect(screen.getByText('blocked')).toBeInTheDocument();
  });

  it('renders empty view while loading', () => {
    vi.mocked(useFeature).mockReturnValue({
      enabled: false,
      value: false,
      loading: true,
      error: null,
    });
    const { container } = render(
      <FeatureGate feature='feature_x' fallback={<span>no</span>}>
        <span>inside</span>
      </FeatureGate>
    );
    expect(container.querySelector('span')).toBeNull();
  });

  it('renders fallback when feature disabled', () => {
    vi.mocked(useFeature).mockReturnValue({
      enabled: false,
      value: false,
      loading: false,
      error: null,
    });
    render(
      <FeatureGate feature='feature_x' fallback={<span>no</span>}>
        <span>inside</span>
      </FeatureGate>
    );
    expect(screen.getByText('no')).toBeInTheDocument();
  });
});

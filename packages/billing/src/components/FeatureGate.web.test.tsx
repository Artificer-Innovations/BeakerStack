import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FeatureGate } from './FeatureGate.web.js';
import { useFeature } from '../hooks/useFeature.js';

vi.mock('../hooks/useFeature.js', () => ({ useFeature: vi.fn() }));

describe('FeatureGate (web)', () => {
  beforeEach(() => {
    vi.mocked(useFeature).mockReset();
  });

  it('renders loading placeholder', () => {
    vi.mocked(useFeature).mockReturnValue({
      enabled: false,
      value: null,
      loading: true,
      error: null,
    });
    const { container } = render(
      <FeatureGate feature='feature_x' fallback={<span>no</span>}>
        <span>yes</span>
      </FeatureGate>
    );
    expect(container.querySelector('span')).toBeInTheDocument();
    expect(screen.queryByText('yes')).not.toBeInTheDocument();
  });

  it('renders fallback when disabled', () => {
    vi.mocked(useFeature).mockReturnValue({
      enabled: false,
      value: false,
      loading: false,
      error: null,
    });
    render(
      <FeatureGate feature='feature_x' fallback={<span>blocked</span>}>
        <span>inside</span>
      </FeatureGate>
    );
    expect(screen.getByText('blocked')).toBeInTheDocument();
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

  it('accepts featureName as spec alias', () => {
    vi.mocked(useFeature).mockReturnValue({
      enabled: true,
      value: true,
      loading: false,
      error: null,
    });
    render(
      <FeatureGate featureName='feature_x' fallback={<span>no</span>}>
        <span>inside</span>
      </FeatureGate>
    );
    expect(useFeature).toHaveBeenCalled();
    expect(screen.getByText('inside')).toBeInTheDocument();
  });
});

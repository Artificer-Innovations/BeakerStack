import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FeatureGate } from './FeatureGate.web.js';
import { useFeature } from '../hooks/useFeature.js';

vi.mock('../hooks/useFeature.js', () => ({ useFeature: vi.fn() }));

describe('FeatureGate (web) — null/empty key early exit', () => {
  beforeEach(() => {
    vi.mocked(useFeature).mockReset();
  });

  it('renders fallback without calling useFeature when no feature key is provided', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = { fallback: <span>fallback-no-key</span> } as any;
    render(
      <FeatureGate {...props}>
        <span>guarded</span>
      </FeatureGate>
    );
    expect(screen.getByText('fallback-no-key')).toBeInTheDocument();
    expect(screen.queryByText('guarded')).not.toBeInTheDocument();
    expect(useFeature).not.toHaveBeenCalled();
  });

  it('renders fallback without calling useFeature when feature is empty string', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <FeatureGate feature={'' as any} fallback={<span>empty-fallback</span>}>
        <span>guarded</span>
      </FeatureGate>
    );
    expect(screen.getByText('empty-fallback')).toBeInTheDocument();
    expect(useFeature).not.toHaveBeenCalled();
  });
});

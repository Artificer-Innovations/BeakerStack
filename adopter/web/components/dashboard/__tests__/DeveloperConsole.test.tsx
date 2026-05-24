import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeveloperConsole } from '../DeveloperConsole';
import type { ActivityEntry } from '../types';

const hp = vi.hoisted(() => ({
  used: 2,
  limit: 10 as number | null,
  exceeded: false,
  usageLoading: false,
  // Mutable feature values shared across tests so we can exercise the val()
  // helper's special cases (-1 → "∞", null/undefined → "null").
  featureValues: {
    containers_per_account_max: 2,
    items_per_container_max: 3,
    feature_a: false,
    feature_b: false,
  } as Record<string, number | boolean | null | undefined>,
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useUsage: () => ({
      used: hp.used,
      limit: hp.limit,
      exceeded: hp.exceeded,
      loading: hp.usageLoading,
    }),
    useFeature: (key: string) => {
      const v = hp.featureValues[key];
      const enabled =
        v === null || v === undefined ? (v as null | undefined) : Boolean(v);
      return { value: v, enabled, loading: false, error: null };
    },
  };
});

function makeEntry(over: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: crypto.randomUUID(),
    at: new Date('2026-01-01T12:00:00Z'),
    label: 'Item 1 summarized',
    rpc: 'billing_record_usage_event',
    ...over,
  };
}

describe('DeveloperConsole', () => {
  beforeEach(() => {
    hp.used = 2;
    hp.limit = 10;
    hp.exceeded = false;
    hp.usageLoading = false;
    hp.featureValues = {
      containers_per_account_max: 2,
      items_per_container_max: 3,
      feature_a: false,
      feature_b: false,
    };
  });

  it('renders Developer Console heading', () => {
    render(<DeveloperConsole activityLog={[]} />);
    expect(screen.getByText(/developer console/i)).toBeInTheDocument();
  });

  it('renders all 5 hook state rows', () => {
    render(<DeveloperConsole activityLog={[]} />);
    expect(screen.getByText('useUsage("ai_summarize")')).toBeInTheDocument();
    expect(
      screen.getByText('useFeature("containers_per_account_max")')
    ).toBeInTheDocument();
    expect(
      screen.getByText('useFeature("items_per_container_max")')
    ).toBeInTheDocument();
    expect(screen.getByText('useFeature("feature_a")')).toBeInTheDocument();
    expect(screen.getByText('useFeature("feature_b")')).toBeInTheDocument();
  });

  it('useUsage row shows live values', () => {
    hp.used = 5;
    hp.limit = 30;
    hp.exceeded = false;
    render(<DeveloperConsole activityLog={[]} />);
    expect(
      screen.getByText(/used: 5, limit: 30, exceeded: false/)
    ).toBeInTheDocument();
  });

  it('useUsage row shows loading placeholder', () => {
    hp.usageLoading = true;
    render(<DeveloperConsole activityLog={[]} />);
    expect(screen.getByText(/\{ … \}/)).toBeInTheDocument();
  });

  it('shows "No activity yet" when activity log is empty', () => {
    render(<DeveloperConsole activityLog={[]} />);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it('renders activity log entries', () => {
    const entries = [
      makeEntry({
        label: 'Item 1 summarized',
        rpc: 'billing_record_usage_event',
      }),
      makeEntry({
        label: 'Collection added',
        rpc: 'billing_demo_add_collection',
      }),
    ];
    render(<DeveloperConsole activityLog={entries} />);
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('Item 1 summarized')).toBeInTheDocument();
    expect(screen.getByText('Collection added')).toBeInTheDocument();
    expect(
      screen.getByText('(billing_record_usage_event)')
    ).toBeInTheDocument();
  });

  it('activity log is aria-live polite', () => {
    const entries = [makeEntry()];
    render(<DeveloperConsole activityLog={entries} />);
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders infinity glyph when useUsage limit is null', () => {
    hp.limit = null;
    render(<DeveloperConsole activityLog={[]} />);
    expect(
      screen.getByText(/used: 2, limit: ∞, exceeded: false/)
    ).toBeInTheDocument();
  });

  it('renders infinity glyph in useFeature row when value is -1 (unlimited)', () => {
    hp.featureValues.containers_per_account_max = -1;
    render(<DeveloperConsole activityLog={[]} />);
    expect(screen.getByText(/value: ∞,/)).toBeInTheDocument();
  });

  it('renders null literal for useFeature value when feature is null/undefined', () => {
    hp.featureValues.feature_a = null;
    render(<DeveloperConsole activityLog={[]} />);
    expect(screen.getByText(/\{ enabled: null \}/)).toBeInTheDocument();
  });
});

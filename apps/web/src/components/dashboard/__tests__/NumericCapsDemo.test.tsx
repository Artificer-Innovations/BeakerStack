import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumericCapsDemo } from '../NumericCapsDemo';

const demo = vi.hoisted(() => ({
  collections: [] as { id: string; item_count: number }[],
  loading: false,
  error: null as string | null,
  addCollection: vi.fn().mockResolvedValue(undefined),
  deleteCollection: vi.fn().mockResolvedValue(undefined),
  addItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/billing/useDemoCollections', () => ({
  useDemoCollections: () => ({
    collections: demo.collections,
    loading: demo.loading,
    error: demo.error,
    refresh: vi.fn(),
    addCollection: demo.addCollection,
    deleteCollection: demo.deleteCollection,
    addItem: demo.addItem,
  }),
}));

const feat = vi.hoisted(() => ({
  colMax: 5 as number | string | null,
  colLoading: false,
  itemMax: 3 as number | string | null,
  itemLoading: false,
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useFeature: (key: string) => {
      if (key === 'containers_per_account_max') {
        return { value: feat.colMax, loading: feat.colLoading };
      }
      if (key === 'items_per_container_max') {
        return { value: feat.itemMax, loading: feat.itemLoading };
      }
      return { value: null, loading: false };
    },
  };
});

describe('NumericCapsDemo', () => {
  beforeEach(() => {
    demo.collections = [];
    demo.loading = false;
    demo.error = null;
    demo.addCollection.mockClear();
    demo.deleteCollection.mockClear();
    demo.addItem.mockClear();
    feat.colMax = 5;
    feat.colLoading = false;
    feat.itemMax = 3;
    feat.itemLoading = false;
  });

  it('shows collections error banner when hook reports error', () => {
    demo.error = 'RPC failed';
    render(<NumericCapsDemo />);
    expect(screen.getByRole('alert')).toHaveTextContent('RPC failed');
    expect(screen.getByText(/demo_billing_mode/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no collections', () => {
    render(<NumericCapsDemo />);
    expect(screen.getByText(/No collections yet/i)).toBeInTheDocument();
  });

  it('shows ellipsis in cap labels while feature limits are loading', () => {
    feat.colLoading = true;
    render(<NumericCapsDemo />);
    expect(screen.getByText(/Collections:/i).textContent).toMatch(/…/);
  });

  it('shows infinity label when limits are unlimited (-1)', () => {
    feat.colMax = -1;
    feat.itemMax = -1;
    demo.collections = [{ id: 'abc12345', item_count: 0 }];
    const { container } = render(<NumericCapsDemo />);
    expect(container.textContent).toContain('\u221e');
  });

  it('adds a collection via wrap helper', async () => {
    const user = userEvent.setup();
    render(<NumericCapsDemo />);
    await user.click(screen.getByRole('button', { name: /Add collection/i }));
    expect(demo.addCollection).toHaveBeenCalled();
  });

  it('disables add collection at cap and shows Limit reached', () => {
    feat.colMax = 1;
    demo.collections = [{ id: 'row1', item_count: 0 }];
    render(<NumericCapsDemo />);
    const btn = screen.getByRole('button', { name: /Limit reached/i });
    expect(btn).toBeDisabled();
  });

  it('adds item and deletes collection', async () => {
    const user = userEvent.setup();
    demo.collections = [{ id: 'coll-1', item_count: 0 }];
    render(<NumericCapsDemo />);

    await user.click(screen.getByRole('button', { name: /Add item/i }));
    expect(demo.addItem).toHaveBeenCalledWith('coll-1');

    await user.click(
      screen.getByRole('button', { name: /Delete collection/i })
    );
    expect(demo.deleteCollection).toHaveBeenCalledWith('coll-1');
  });

  it('disables add item when row hits per-collection item cap', () => {
    feat.itemMax = 2;
    demo.collections = [{ id: 'c2', item_count: 2 }];
    render(<NumericCapsDemo />);
    const limits = screen.getAllByRole('button', { name: /Limit reached/i });
    expect(limits.length).toBeGreaterThanOrEqual(1);
    expect(limits[0]).toBeDisabled();
  });

  it('surfaces non-Error rejects from addItem', async () => {
    const user = userEvent.setup();
    demo.collections = [{ id: 'c9', item_count: 0 }];
    demo.addItem.mockRejectedValue('x');
    render(<NumericCapsDemo />);
    await user.click(screen.getByRole('button', { name: /Add item/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Action failed.');
    });
  });
});

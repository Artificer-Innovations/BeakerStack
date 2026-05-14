import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionsGrid } from '../CollectionsGrid';
import type { DemoCollectionRow } from '@/billing/useDemoCollections';

const hp = vi.hoisted(() => ({
  maxCollectionsValue: 2 as number | boolean | null,
  featLoading: false,
}));

vi.mock('@beakerstack/billing', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/billing')>();
  return {
    ...actual,
    useFeature: (key: string) => {
      if (key === 'containers_per_account_max') {
        return {
          value: hp.maxCollectionsValue,
          enabled: true,
          loading: hp.featLoading,
          error: null,
        };
      }
      return { value: null, enabled: false, loading: false, error: null };
    },
  };
});

const makeCol = (id: string, item_count = 0): DemoCollectionRow => ({
  id,
  item_count,
});

const onSelect = vi.fn();
const addCollection = vi.fn();
const deleteCollection = vi.fn();
const onActivity = vi.fn();

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

describe('CollectionsGrid', () => {
  beforeEach(() => {
    hp.maxCollectionsValue = 2;
    hp.featLoading = false;
    onSelect.mockClear();
    addCollection.mockReset().mockResolvedValue(undefined);
    deleteCollection.mockReset().mockResolvedValue(undefined);
    onActivity.mockClear();
  });

  it('shows empty state when no collections', () => {
    renderGrid([]);
    expect(screen.getByText(/no collections yet/i)).toBeInTheDocument();
  });

  it('renders collection cards with id prefix and item count', () => {
    renderGrid([makeCol('abcdef12-0000-0000-0000-000000000000', 3)]);
    expect(screen.getByText('abcdef12…')).toBeInTheDocument();
    expect(screen.getByText(/3 items/i)).toBeInTheDocument();
  });

  it('shows singular "item" when item_count is 1', () => {
    renderGrid([makeCol('col-1', 1)]);
    expect(screen.getByText(/1 item$/)).toBeInTheDocument();
  });

  it('add button enabled when under cap', () => {
    renderGrid([makeCol('col-1')]);
    expect(
      screen.getByRole('button', { name: /new collection/i })
    ).toBeEnabled();
  });

  it('add button disabled and shows "Limit reached" when at cap', () => {
    hp.maxCollectionsValue = 1;
    renderGrid([makeCol('col-1')]);
    expect(
      screen.getByRole('button', { name: /limit reached/i })
    ).toBeDisabled();
  });

  it('add collection: calls addCollection and fires onActivity', async () => {
    const user = userEvent.setup();
    renderGrid([]);

    await user.click(screen.getByRole('button', { name: /new collection/i }));
    await waitFor(() => expect(addCollection).toHaveBeenCalled());
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_demo_add_collection' })
    );
  });

  it('add collection error: shows actionErr alert', async () => {
    const user = userEvent.setup();
    addCollection.mockRejectedValue(new Error('DB error'));
    renderGrid([]);

    await user.click(screen.getByRole('button', { name: /new collection/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('DB error')
    );
  });

  it('delete collection: calls deleteCollection with collection id and fires onActivity', async () => {
    const user = userEvent.setup();
    renderGrid([makeCol('col-xyz')]);

    await user.click(
      screen.getByRole('button', { name: /delete collection/i })
    );
    await waitFor(() =>
      expect(deleteCollection).toHaveBeenCalledWith('col-xyz')
    );
    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: 'billing_demo_delete_collection' })
    );
  });

  it('delete collection error: shows error alert', async () => {
    const user = userEvent.setup();
    deleteCollection.mockRejectedValue(new Error('Delete failed'));
    renderGrid([makeCol('col-del-err')]);

    await user.click(
      screen.getByRole('button', { name: /delete collection/i })
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Delete failed')
    );
  });

  it('delete button shows busy state during delete', async () => {
    const user = userEvent.setup();
    let resolve!: (v: void) => void;
    deleteCollection.mockReturnValue(
      new Promise(res => {
        resolve = res;
      })
    );
    renderGrid([makeCol('col-abc')]);

    await user.click(
      screen.getByRole('button', { name: /delete collection/i })
    );

    expect(
      screen.getByRole('button', { name: /delete collection/i })
    ).toBeDisabled();
    resolve();
  });

  it('shows error prop as alert', () => {
    renderGrid([], { error: 'Could not load collections' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load collections'
    );
  });

  it('clicking a collection card calls onSelect', async () => {
    const user = userEvent.setup();
    renderGrid([makeCol('col-sel')]);

    const card = screen
      .getByRole('button', { name: /delete collection/i })
      .closest('[role="button"]');
    if (!card) throw new Error('card element not found');
    await user.click(card);
    expect(onSelect).toHaveBeenCalledWith('col-sel');
  });

  it('selected card gets aria-pressed=true', () => {
    renderGrid([makeCol('col-sel')], { selectedId: 'col-sel' });
    expect(
      screen.getByRole('button', { name: /delete/i }).closest('[aria-pressed]')
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('pressing Enter on a collection card calls onSelect', () => {
    // Use fireEvent.keyDown so the onKeyDown handler fires directly rather than
    // userEvent's ARIA simulation (which converts Enter on role=button to a click).
    renderGrid([makeCol('col-kb')]);

    const card = screen
      .getByRole('button', { name: /delete collection/i })
      .closest('[role="button"]') as HTMLElement;
    if (!card) throw new Error('card element not found');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('col-kb');
  });

  it('pressing Space on a collection card calls onSelect', () => {
    // Use fireEvent.keyDown so the onKeyDown handler fires directly rather than
    // userEvent's ARIA simulation (which converts Space on role=button to a click).
    renderGrid([makeCol('col-kb2')]);

    const card = screen
      .getByRole('button', { name: /delete collection/i })
      .closest('[role="button"]') as HTMLElement;
    if (!card) throw new Error('card element not found');
    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledWith('col-kb2');
  });
});

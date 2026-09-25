import { useCallback, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useFeature } from '@beakerstack/billing';
import { billingConfig } from '@adopter/config/billing';
import type { DemoCollectionRow } from '../../billing/useDemoCollections';
import type { ActivityEntry } from './types';
import { limLabel } from './utils';

interface Props {
  collections: DemoCollectionRow[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  addCollection: () => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  onActivity: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void;
}

export function CollectionsGrid({
  collections,
  loading,
  error,
  selectedId,
  onSelect,
  addCollection,
  deleteCollection,
  onActivity,
}: Props) {
  const { value: maxCollectionsRaw, loading: featLoading } = useFeature<
    typeof billingConfig,
    'containers_per_account_max'
  >('containers_per_account_max');

  const maxCollections =
    typeof maxCollectionsRaw === 'number' ? maxCollectionsRaw : null;
  const atCap =
    maxCollections !== null &&
    maxCollections !== -1 &&
    collections.length >= maxCollections;

  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const wrap = useCallback(async (key: string, fn: () => Promise<void>) => {
    setActionErr(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }, []);

  const handleAdd = () =>
    void wrap('add', async () => {
      await addCollection();
      onActivity({
        label: 'Collection added',
        rpc: 'billing_demo_add_collection',
      });
    });

  const handleDelete = (id: string) =>
    void wrap(`del:${id}`, async () => {
      await deleteCollection(id);
      onActivity({
        label: 'Collection deleted',
        rpc: 'billing_demo_delete_collection',
      });
    });

  return (
    <div>
      <div className='flex flex-wrap items-center justify-between gap-2 mb-4'>
        <div>
          <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
            Collections
          </h3>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
            {loading || featLoading
              ? '…'
              : `${collections.length} of ${limLabel(maxCollections)}`}
          </p>
        </div>
        <AddButton
          atCap={atCap}
          disabled={atCap || loading || featLoading || busy === 'add'}
          adding={busy === 'add'}
          onAdd={handleAdd}
        />
      </div>

      {error && (
        <p
          className='mb-3 text-sm text-amber-800 dark:text-amber-300'
          role='alert'
        >
          {error}{' '}
          <span className='text-gray-600 dark:text-gray-400'>
            (Requires demo billing RPCs and{' '}
            <code className='text-xs'>demo_billing_mode</code> in the database.)
          </span>
        </p>
      )}

      {actionErr && (
        <p className='mb-3 text-sm text-red-600' role='alert'>
          {actionErr}
        </p>
      )}

      {!loading && collections.length === 0 ? (
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          No collections yet. Click &apos;New collection&apos; to start.
        </p>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {collections.map(col => (
            <CollectionCard
              key={col.id}
              col={col}
              isSelected={col.id === selectedId}
              deleteBusy={busy === `del:${col.id}`}
              onSelect={onSelect}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AddButtonProps {
  atCap: boolean;
  disabled: boolean;
  adding: boolean;
  onAdd: () => void;
}

function AddButton({ atCap, disabled, adding, onAdd }: AddButtonProps) {
  return (
    <button
      type='button'
      disabled={disabled}
      title={atCap ? 'Collection limit reached for your plan' : undefined}
      onClick={onAdd}
      className='inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50'
    >
      <Plus className='h-3.5 w-3.5' aria-hidden />
      {adding ? '…' : atCap ? 'Limit reached' : 'New collection'}
    </button>
  );
}

interface CollectionCardProps {
  col: DemoCollectionRow;
  isSelected: boolean;
  deleteBusy: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function CollectionCard({
  col,
  isSelected,
  deleteBusy,
  onSelect,
  onDelete,
}: CollectionCardProps) {
  return (
    <div
      className={`relative rounded-lg border-2 bg-white dark:bg-gray-800 p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-indigo-500 ring-1 ring-indigo-500'
          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
      onClick={() => onSelect(col.id)}
      role='button'
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(col.id);
        }
      }}
    >
      <p className='font-mono text-xs text-gray-400 dark:text-gray-500 truncate'>
        {col.id.slice(0, 8)}…
      </p>
      <p className='mt-1.5 text-sm font-medium text-gray-900 dark:text-white'>
        Collection
      </p>
      <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
        {col.item_count} item{col.item_count !== 1 ? 's' : ''}
      </p>
      <button
        type='button'
        aria-label='Delete collection'
        disabled={deleteBusy}
        onClick={e => {
          e.stopPropagation();
          onDelete(col.id);
        }}
        className='absolute top-2 right-2 rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors'
      >
        <Trash2 className='h-3.5 w-3.5' aria-hidden />
      </button>
    </div>
  );
}

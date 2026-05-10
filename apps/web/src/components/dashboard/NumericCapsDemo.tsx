import { useCallback, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useFeature } from '@beakerstack/billing';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';
import { useDemoCollections } from '../../billing/useDemoCollections';

function limLabel(v: number | null): string {
  if (v === null) return '…';
  if (v === -1) return '∞';
  return String(v);
}

export function NumericCapsDemo() {
  const {
    collections,
    loading,
    error,
    addCollection,
    deleteCollection,
    addItem,
  } = useDemoCollections();
  const { value: maxCollectionsRaw, loading: featColLoading } = useFeature<
    typeof beakerstackBillingConfig,
    'containers_per_account_max'
  >('containers_per_account_max');
  const { value: maxItemsRaw, loading: featItemLoading } = useFeature<
    typeof beakerstackBillingConfig,
    'items_per_container_max'
  >('items_per_container_max');

  const maxCollections =
    typeof maxCollectionsRaw === 'number' ? maxCollectionsRaw : null;
  const maxItemsPer = typeof maxItemsRaw === 'number' ? maxItemsRaw : null;

  const count = collections.length;
  const atCollectionCap =
    maxCollections !== null && maxCollections !== -1 && count >= maxCollections;

  const [busy, setBusy] = useState<'add-col' | string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const wrap = useCallback(
    async (key: typeof busy, fn: () => Promise<void>) => {
      setActionErr(null);
      setBusy(key);
      try {
        await fn();
      } catch (e) {
        setActionErr(e instanceof Error ? e.message : 'Action failed.');
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const featLoading = featColLoading || featItemLoading;

  return (
    <div>
      {error && (
        <p className='mb-2 text-sm text-amber-800' role='alert'>
          {error}{' '}
          <span className='text-gray-600'>
            (Requires demo billing RPCs and{' '}
            <code className='text-xs'>demo_billing_mode</code> in the database.)
          </span>
        </p>
      )}
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-sm text-gray-700'>
          Collections:{' '}
          <span className='font-medium'>
            {loading || featLoading ? '…' : count} of {limLabel(maxCollections)}
          </span>
        </p>
        <button
          type='button'
          disabled={
            atCollectionCap || loading || featLoading || busy === 'add-col'
          }
          title={
            atCollectionCap
              ? 'Collection limit reached for your plan'
              : undefined
          }
          onClick={() =>
            void wrap('add-col', async () => {
              await addCollection();
            })
          }
          className='inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50'
        >
          {busy === 'add-col'
            ? '…'
            : atCollectionCap
              ? 'Limit reached'
              : 'Add collection'}
        </button>
      </div>

      {actionErr && (
        <p className='mt-2 text-sm text-red-600' role='alert'>
          {actionErr}
        </p>
      )}

      {!loading && collections.length === 0 ? (
        <p className='mt-4 text-sm text-gray-500'>
          No collections yet. Click &apos;Add collection&apos; to start.
        </p>
      ) : (
        <ul className='mt-4 space-y-3'>
          {collections.map(row => {
            const itemCap =
              maxItemsPer !== null &&
              maxItemsPer !== -1 &&
              row.item_count >= maxItemsPer;
            const busyKey = `item:${row.id}`;
            const delKey = `del:${row.id}`;
            return (
              <li
                key={row.id}
                className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-3'
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <p className='font-mono text-xs text-gray-600'>
                      {row.id.slice(0, 8)}…
                    </p>
                    <p className='mt-1 text-sm text-gray-700'>
                      Items: {row.item_count} of {limLabel(maxItemsPer)}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      disabled={
                        itemCap || loading || featLoading || busy === busyKey
                      }
                      title={
                        itemCap
                          ? 'Item limit reached for this collection'
                          : undefined
                      }
                      onClick={() =>
                        void wrap(busyKey, async () => {
                          await addItem(row.id);
                        })
                      }
                      className='rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                    >
                      {busy === busyKey
                        ? '…'
                        : itemCap
                          ? 'Limit reached'
                          : 'Add item'}
                    </button>
                    <button
                      type='button'
                      aria-label='Delete collection'
                      disabled={busy === delKey}
                      onClick={() =>
                        void wrap(delKey, async () => {
                          await deleteCollection(row.id);
                        })
                      }
                      className='rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50'
                    >
                      <Trash2 className='h-4 w-4' aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

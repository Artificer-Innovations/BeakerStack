import type { KeyboardEvent, ReactNode, ThHTMLAttributes } from 'react';

export type AdminTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Applied to `<th scope="col">` (e.g. `aria-sort` for sortable columns). */
  headerCellProps?: Pick<ThHTMLAttributes<HTMLTableCellElement>, 'aria-sort'>;
};

export type AdminTableProps<T> = {
  columns: AdminTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Accessible row label; defaults to `getRowKey(row)`. */
  getRowLabel?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
};

export function AdminTable<T>({
  columns,
  rows,
  getRowKey,
  getRowLabel,
  onRowClick,
  emptyMessage = 'No rows to display.',
  loading = false,
}: AdminTableProps<T>) {
  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200 text-sm'>
          <thead className='bg-gray-50'>
            <tr>
              {columns.map(col => (
                <th
                  key={col.id}
                  scope='col'
                  aria-sort={col.headerCellProps?.['aria-sort']}
                  className={[
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500',
                    col.className ?? '',
                  ].join(' ')}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200 bg-white'>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className='px-4 py-8 text-center text-gray-500'
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className='px-4 py-8 text-center text-gray-500'
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const rowKey = getRowKey(row);
                const rowLabel = getRowLabel?.(row) ?? rowKey;
                return (
                  <tr
                    key={rowKey}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    aria-label={
                      onRowClick ? `View details for ${rowLabel}` : undefined
                    }
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event: KeyboardEvent<HTMLTableRowElement>) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    className={
                      onRowClick
                        ? 'cursor-pointer hover:bg-indigo-50/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset'
                        : undefined
                    }
                  >
                    {columns.map(col => (
                      <td
                        key={col.id}
                        className={[
                          'px-4 py-3 text-gray-900',
                          col.className ?? '',
                        ].join(' ')}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

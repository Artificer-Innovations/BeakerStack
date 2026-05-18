import { useMemo, useState } from 'react';
import type { WaitlistEntryRow } from '@beakerstack/waitlist';
import {
  AdminPagination,
  AdminSearchInput,
  AdminTable,
  type AdminTableColumn,
} from '@beakerstack/admin/web';
import { AdminWaitlistDetailDrawer } from '../components/AdminWaitlistDetailDrawer.web';
import { useAdminWaitlist } from '../hooks/useAdminWaitlist';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'converted', label: 'Converted' },
];

export default function AdminWaitlistPage() {
  const {
    search,
    setSearch,
    status,
    setStatus,
    offset,
    setOffset,
    pageSize,
    data,
    loading,
    error,
    reload,
  } = useAdminWaitlist();

  const [selected, setSelected] = useState<WaitlistEntryRow | null>(null);

  const columns = useMemo((): AdminTableColumn<WaitlistEntryRow>[] => {
    return [
      {
        id: 'email',
        header: 'Email',
        cell: row => <span className='font-medium'>{row.email}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: row => row.status,
      },
      {
        id: 'submitted',
        header: 'Submitted',
        cell: row => formatDate(row.submitted_at),
      },
      {
        id: 'approved',
        header: 'Approved',
        cell: row => formatDate(row.approved_at),
      },
    ];
  }, []);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-gray-900'>Waitlist</h2>
        <p className='mt-1 text-sm text-gray-600'>
          Review signups, approve invites, and copy invite links.
        </p>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <AdminSearchInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search by email'
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className='rounded-md border border-gray-300 px-3 py-2 text-sm'
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className='text-sm text-red-600' role='alert'>
          {error.message}
        </p>
      ) : null}

      <AdminTable
        columns={columns}
        rows={data?.entries ?? []}
        getRowKey={row => row.id}
        onRowClick={setSelected}
        loading={loading}
        emptyMessage='No waitlist entries match your filters.'
      />

      {data ? (
        <AdminPagination
          total={data.total}
          limit={pageSize}
          offset={offset}
          onPageChange={setOffset}
        />
      ) : null}

      <AdminWaitlistDetailDrawer
        entry={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onUpdated={() => {
          void reload();
          if (selected) {
            const fresh = data?.entries.find(e => e.id === selected.id);
            if (fresh) setSelected(fresh);
          }
        }}
      />
    </div>
  );
}

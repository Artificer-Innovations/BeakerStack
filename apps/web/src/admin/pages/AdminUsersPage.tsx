import { useEffect, useMemo, useState } from 'react';
import type { AdminUserListRow } from '@beakerstack/admin';
import {
  AdminPagination,
  AdminSearchInput,
  AdminTable,
  type AdminTableColumn,
} from '@beakerstack/admin/web';
import { AdminUserDetailDrawer } from '../components/AdminUserDetailDrawer.web';
import { getAdminUsageMeterKeys } from '../adminUsageColumns';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { supabase } from '../../lib/supabase';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatMeterLabel(key: string) {
  return key.replace(/_/g, ' ');
}

export default function AdminUsersPage() {
  const {
    search,
    setSearch,
    sort,
    sortDir,
    toggleSort,
    offset,
    setOffset,
    pageSize,
    data,
    loading,
    error,
    reload,
  } = useAdminUsers();

  const [selected, setSelected] = useState<AdminUserListRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const meterKeys = useMemo(() => getAdminUsageMeterKeys(), []);

  useEffect(() => {
    void supabase.auth
      .getUser()
      .then(({ data: d }) => setCurrentUserId(d.user?.id ?? null));
  }, []);

  const columns = useMemo((): AdminTableColumn<AdminUserListRow>[] => {
    const base: AdminTableColumn<AdminUserListRow>[] = [
      {
        id: 'email',
        header: 'Email',
        cell: row => <span className='font-medium'>{row.email ?? '—'}</span>,
      },
      {
        id: 'admin',
        header: 'Admin',
        cell: row =>
          row.is_admin ? (
            <span
              data-testid='admin-badge'
              className='inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20'
            >
              Admin
            </span>
          ) : null,
      },
      {
        id: 'display_name',
        header: 'Name',
        cell: row => row.display_name ?? row.username ?? '—',
      },
      {
        id: 'signup',
        headerCellProps: {
          'aria-sort':
            sort === 'signup'
              ? sortDir === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none',
        },
        header: (
          <button
            type='button'
            className='w-full text-left font-semibold uppercase tracking-wide hover:text-indigo-600'
            onClick={e => {
              e.stopPropagation();
              toggleSort('signup');
            }}
          >
            Signup {sort === 'signup' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
        ),
        cell: row => formatDate(row.signup_at),
      },
      {
        id: 'last_active',
        headerCellProps: {
          'aria-sort':
            sort === 'last_active'
              ? sortDir === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none',
        },
        header: (
          <button
            type='button'
            className='w-full text-left font-semibold uppercase tracking-wide hover:text-indigo-600'
            onClick={e => {
              e.stopPropagation();
              toggleSort('last_active');
            }}
          >
            Last active{' '}
            {sort === 'last_active' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
        ),
        cell: row => formatDate(row.last_active_at),
      },
      {
        id: 'plan',
        header: 'Plan',
        cell: row => row.plan_display_name ?? row.plan_id ?? '—',
      },
    ];

    for (const key of meterKeys) {
      base.push({
        id: `usage_${key}`,
        header: formatMeterLabel(key),
        cell: row => String(row.usage_current_period?.[key] ?? 0),
        className: 'tabular-nums text-gray-600',
      });
    }

    return base;
  }, [meterKeys, sort, sortDir, toggleSort]);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-gray-900'>Users</h2>
        <p className='mt-1 text-sm text-gray-600'>
          All app users with billing tier and current-period usage.
        </p>
      </div>

      <AdminSearchInput
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {error && (
        <p className='text-sm text-red-600' role='alert'>
          {error.message}
        </p>
      )}

      <AdminTable
        columns={columns}
        rows={data?.users ?? []}
        getRowKey={row => row.user_id}
        getRowLabel={row => row.email ?? row.display_name ?? row.user_id}
        onRowClick={setSelected}
        loading={loading}
        emptyMessage='No users match your search.'
      />

      {data && (
        <AdminPagination
          total={data.total}
          limit={pageSize}
          offset={offset}
          onPageChange={setOffset}
        />
      )}

      <AdminUserDetailDrawer
        open={selected !== null}
        userId={selected?.user_id ?? null}
        title={selected?.email ?? 'User'}
        onClose={() => setSelected(null)}
        currentUserId={currentUserId}
        onAccessChanged={reload}
      />
    </div>
  );
}

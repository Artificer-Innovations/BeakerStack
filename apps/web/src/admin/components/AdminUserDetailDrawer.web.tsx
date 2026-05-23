import { useEffect, useState } from 'react';
import {
  getUser,
  grantOperator,
  revokeOperator,
  type AdminUserDetail,
} from '@beakerstack/admin';
import { AdminDetailDrawer } from '@beakerstack/admin/web';
import { supabase } from '../../lib/supabase';
import { adminProductId } from '../adminUsageColumns';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function AdminUserDetailDrawer({
  userId,
  title,
  open,
  onClose,
  currentUserId,
  onAccessChanged,
}: {
  userId: string | null;
  title: string;
  open: boolean;
  onClose: () => void;
  currentUserId?: string | null;
  onAccessChanged?: () => void;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<'grant' | 'revoke' | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) {
      setDetail(null);
      setActionPending(null);
      setActionError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getUser(supabase, userId, adminProductId)
      .then(d => {
        if (!cancelled) setDetail(d);
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load user');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const refreshDetail = async () => {
    if (!userId) return;
    try {
      const d = await getUser(supabase, userId, adminProductId);
      setDetail(d);
    } catch {
      // ignore refresh errors — stale detail is better than losing context
    }
  };

  const handleConfirmAction = async () => {
    if (!userId || !actionPending) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (actionPending === 'grant') {
        await grantOperator(supabase, userId);
      } else {
        await revokeOperator(supabase, userId);
      }
      setActionPending(null);
      await refreshDetail();
      onAccessChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setActionError(
        msg === 'cannot_self_revoke'
          ? "You can't revoke your own admin access"
          : msg
      );
    } finally {
      setActionLoading(false);
    }
  };

  const isSelf =
    userId !== null && currentUserId !== null && userId === currentUserId;

  return (
    <AdminDetailDrawer open={open} title={title} onClose={onClose}>
      {loading && <p className='text-sm text-gray-500'>Loading…</p>}
      {error && (
        <p className='text-sm text-red-600' role='alert'>
          {error}
        </p>
      )}
      {!loading && !error && detail && (
        <div className='space-y-6 text-sm'>
          <section>
            <h3 className='font-semibold text-gray-900'>Account</h3>
            <dl className='mt-2 space-y-1 text-gray-600'>
              <div className='flex justify-between gap-4'>
                <dt>Email</dt>
                <dd className='text-gray-900'>{detail.auth.email ?? '—'}</dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt>Signed up</dt>
                <dd>{formatDate(detail.auth.created_at)}</dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt>Last active</dt>
                <dd>{formatDate(detail.auth.last_sign_in_at)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className='font-semibold text-gray-900'>Operator access</h3>
            <div className='mt-2 space-y-3'>
              {detail.admin.is_admin ? (
                <>
                  <div className='flex flex-wrap items-center gap-2 text-gray-600'>
                    <span className='inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20'>
                      Admin
                    </span>
                    {detail.admin.granted_by_email && (
                      <span className='text-xs text-gray-500'>
                        granted by {detail.admin.granted_by_email}
                      </span>
                    )}
                    {detail.admin.granted_at && (
                      <span className='text-xs text-gray-400'>
                        {formatDate(detail.admin.granted_at)}
                      </span>
                    )}
                  </div>
                  <button
                    type='button'
                    disabled={currentUserId == null || isSelf || actionLoading}
                    title={
                      isSelf
                        ? "You can't revoke your own admin access"
                        : undefined
                    }
                    className='rounded bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50'
                    onClick={() => setActionPending('revoke')}
                  >
                    Revoke admin access
                  </button>
                </>
              ) : (
                <>
                  <p className='text-xs text-gray-500'>No admin access</p>
                  <button
                    type='button'
                    disabled={actionLoading}
                    className='rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50'
                    onClick={() => setActionPending('grant')}
                  >
                    Grant admin access
                  </button>
                </>
              )}
              {actionError && (
                <p className='text-xs text-red-600' role='alert'>
                  {actionError}
                </p>
              )}
            </div>
          </section>

          {actionPending && (
            <div
              role='dialog'
              aria-modal='true'
              aria-labelledby='confirm-dialog-title'
              className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'
              data-testid='confirm-dialog'
            >
              <div className='w-80 rounded-lg bg-white p-6 shadow-xl'>
                <h4
                  id='confirm-dialog-title'
                  className='text-sm font-semibold text-gray-900'
                >
                  {actionPending === 'grant'
                    ? 'Grant admin access'
                    : 'Revoke admin access'}
                </h4>
                <p className='mt-2 text-sm text-gray-600'>
                  {actionPending === 'grant'
                    ? `Grant admin access to ${detail.auth.email ?? 'this user'}?`
                    : `Revoke admin access from ${detail.auth.email ?? 'this user'}?`}
                </p>
                <div className='mt-4 flex justify-end gap-3'>
                  <button
                    type='button'
                    disabled={actionLoading}
                    className='rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50'
                    onClick={() => {
                      setActionPending(null);
                      setActionError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    disabled={actionLoading}
                    className={`rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
                      actionPending === 'grant'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                    onClick={() => void handleConfirmAction()}
                  >
                    {actionLoading ? 'Please wait…' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {detail.profile && (
            <section>
              <h3 className='font-semibold text-gray-900'>Profile</h3>
              <dl className='mt-2 space-y-1 text-gray-600'>
                <div className='flex justify-between gap-4'>
                  <dt>Display name</dt>
                  <dd className='text-gray-900'>
                    {(detail.profile['display_name'] as string) ?? '—'}
                  </dd>
                </div>
                <div className='flex justify-between gap-4'>
                  <dt>Username</dt>
                  <dd>{(detail.profile['username'] as string) ?? '—'}</dd>
                </div>
              </dl>
            </section>
          )}

          <section>
            <h3 className='font-semibold text-gray-900'>Billing</h3>
            <dl className='mt-2 space-y-1 text-gray-600'>
              <div className='flex justify-between gap-4'>
                <dt>Plan</dt>
                <dd className='text-gray-900'>
                  {(detail.plan?.['display_name'] as string) ??
                    detail.subscription?.['plan_id'] ??
                    '—'}
                </dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt>Status</dt>
                <dd>{(detail.subscription?.['status'] as string) ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {detail.usage_aggregates.length > 0 && (
            <section>
              <h3 className='font-semibold text-gray-900'>
                Current period usage
              </h3>
              <ul className='mt-2 space-y-1 text-gray-600'>
                {detail.usage_aggregates.map((row, i) => (
                  <li key={i} className='flex justify-between gap-4'>
                    <span>{String(row['event_type'] ?? '')}</span>
                    <span className='font-medium text-gray-900'>
                      {String(row['count'] ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.usage_events.length > 0 && (
            <section>
              <h3 className='font-semibold text-gray-900'>
                Recent usage events
              </h3>
              <ul className='mt-2 max-h-48 overflow-y-auto space-y-2 text-gray-600'>
                {detail.usage_events.slice(0, 20).map((ev, i) => (
                  <li key={i} className='border-b border-gray-100 pb-2'>
                    <span className='font-medium text-gray-800'>
                      {String(ev['event_type'] ?? '')}
                    </span>
                    <span className='ml-2'>×{String(ev['quantity'] ?? 1)}</span>
                    <span className='block text-xs text-gray-400'>
                      {formatDate(ev['created_at'] as string)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.invoices.length > 0 && (
            <section>
              <h3 className='font-semibold text-gray-900'>Invoices</h3>
              <ul className='mt-2 space-y-1 text-gray-600'>
                {detail.invoices.map((inv, i) => (
                  <li key={i} className='flex justify-between gap-4'>
                    <span>{String(inv['stripe_invoice_id'] ?? inv['id'])}</span>
                    <span>{formatDate(inv['created_at'] as string)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AdminDetailDrawer>
  );
}

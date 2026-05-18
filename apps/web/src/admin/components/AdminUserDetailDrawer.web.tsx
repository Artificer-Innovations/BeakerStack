import { useEffect, useState } from 'react';
import { getUser, type AdminUserDetail } from '@beakerstack/admin';
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
}: {
  userId: string | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) {
      setDetail(null);
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

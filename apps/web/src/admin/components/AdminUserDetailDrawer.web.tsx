import { useEffect, useState } from 'react';
import {
  getUser,
  grantBillingComp,
  grantOperator,
  revokeBillingComp,
  revokeOperator,
  type AdminUserDetail,
} from '@beakerstack/admin';
import { AdminDetailDrawer } from '@beakerstack/admin/web';
import { billingConfig } from '@adopter/config/billing';
import { supabase } from '../../lib/supabase';
import { adminProductId } from '../adminUsageColumns';

const COMP_VIP_PLAN_ID = 'beakerstack_vip';

type OperatorAction = 'grant' | 'revoke';
type CompAction = 'grant_comp' | 'revoke_comp';
type PendingAction = OperatorAction | CompAction | null;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function compErrorMessage(code: string): string {
  switch (code) {
    case 'stripe_subscription_active':
      return 'User has an active Stripe subscription. Cancel or migrate billing before granting complimentary access.';
    case 'invalid_reason':
      return 'Reason is required (max 500 characters).';
    case 'invalid_plan':
      return 'Invalid complimentary plan.';
    case 'no_free_plan':
      return 'No public free plan configured for this product.';
  }
  return code;
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
  const [actionPending, setActionPending] = useState<PendingAction>(null);
  const [compReason, setCompReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) {
      setDetail(null);
      setActionPending(null);
      setCompReason('');
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

  const dismissDialog = () => {
    setActionPending(null);
    setCompReason('');
    setActionError(null);
  };

  const handleConfirmAction = async () => {
    if (!userId || !actionPending) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (actionPending === 'grant') {
        await grantOperator(supabase, userId);
      } else if (actionPending === 'revoke') {
        await revokeOperator(supabase, userId);
      } else if (actionPending === 'grant_comp') {
        await grantBillingComp(supabase, {
          userId,
          productId: adminProductId,
          planId: COMP_VIP_PLAN_ID,
          reason: compReason.trim(),
        });
      } else if (actionPending === 'revoke_comp') {
        await revokeBillingComp(supabase, userId, adminProductId);
      }
      dismissDialog();
      await refreshDetail();
      onAccessChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      if (msg === 'cannot_self_revoke') {
        setActionError("You can't revoke your own admin access");
      } else if (
        msg === 'stripe_subscription_active' ||
        msg === 'invalid_reason' ||
        msg === 'invalid_plan' ||
        msg === 'no_free_plan'
      ) {
        setActionError(compErrorMessage(msg));
      } else {
        setActionError(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const isSelf =
    userId !== null && currentUserId !== null && userId === currentUserId;

  const hasCompAccess =
    Boolean(detail?.comp_grant) ||
    (detail?.subscription?.['status'] as string | undefined) === 'comped';

  const vipPlanName =
    billingConfig.plans.find(p => p.id === COMP_VIP_PLAN_ID)?.displayName ??
    'VIP (complimentary)';

  const confirmTitle = (() => {
    switch (actionPending) {
      case 'grant':
        return 'Grant admin access';
      case 'revoke':
        return 'Revoke admin access';
      case 'grant_comp':
        return 'Grant complimentary VIP';
      case 'revoke_comp':
        return 'Revoke complimentary access';
      default:
        return '';
    }
  })();

  const confirmBody = (() => {
    const email = detail?.auth.email ?? 'this user';
    switch (actionPending) {
      case 'grant':
        return `Grant admin access to ${email}?`;
      case 'revoke':
        return `Revoke admin access from ${email}?`;
      case 'grant_comp':
        return `Grant ${vipPlanName} to ${email}? This does not create a Stripe subscription.`;
      case 'revoke_comp':
        return `Revoke complimentary access for ${email}? They will return to the public free plan.`;
      default:
        return '';
    }
  })();

  const confirmDisabled =
    actionLoading || (actionPending === 'grant_comp' && !compReason.trim());

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
            </div>
          </section>

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
            {detail.comp_grant ? (
              <div className='mt-3 space-y-1 rounded-md bg-indigo-50/80 px-3 py-2 text-xs text-indigo-950'>
                <p className='font-medium text-indigo-900'>
                  Complimentary access
                </p>
                <p>
                  <span className='text-indigo-700'>Reason:</span>{' '}
                  {detail.comp_grant.comp_reason}
                </p>
                {detail.comp_grant.comped_by_email ? (
                  <p>
                    <span className='text-indigo-700'>Granted by:</span>{' '}
                    {detail.comp_grant.comped_by_email}
                  </p>
                ) : null}
                <p>
                  <span className='text-indigo-700'>Granted:</span>{' '}
                  {formatDate(detail.comp_grant.comped_at)}
                </p>
                {detail.comp_grant.comp_expires_at ? (
                  <p>
                    <span className='text-indigo-700'>Expires:</span>{' '}
                    {formatDate(detail.comp_grant.comp_expires_at)}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className='mt-3 flex flex-wrap gap-2'>
              {!hasCompAccess ? (
                <button
                  type='button'
                  disabled={actionLoading}
                  className='rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50'
                  onClick={() => {
                    setCompReason('');
                    setActionPending('grant_comp');
                  }}
                >
                  Grant complimentary VIP
                </button>
              ) : (
                <button
                  type='button'
                  disabled={actionLoading}
                  className='rounded bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50'
                  onClick={() => setActionPending('revoke_comp')}
                >
                  Revoke complimentary access
                </button>
              )}
            </div>
            {actionError && actionPending === null ? (
              <p className='mt-2 text-xs text-red-600' role='alert'>
                {actionError}
              </p>
            ) : null}
          </section>

          {actionPending && (
            <div
              role='dialog'
              aria-modal='true'
              aria-labelledby='confirm-dialog-title'
              className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'
              data-testid='confirm-dialog'
            >
              <div className='w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white p-6 shadow-xl'>
                <h4
                  id='confirm-dialog-title'
                  className='text-sm font-semibold text-gray-900'
                >
                  {confirmTitle}
                </h4>
                <p className='mt-2 text-sm text-gray-600'>{confirmBody}</p>
                {actionPending === 'grant_comp' ? (
                  <label className='mt-3 block text-sm text-gray-700'>
                    <span className='font-medium'>Reason (required)</span>
                    <textarea
                      className='mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm'
                      rows={3}
                      maxLength={500}
                      value={compReason}
                      onChange={e => setCompReason(e.target.value)}
                      placeholder='e.g. design partner, press access'
                      data-testid='comp-grant-reason'
                    />
                  </label>
                ) : null}
                {actionError ? (
                  <p className='mt-2 text-xs text-red-600' role='alert'>
                    {actionError}
                  </p>
                ) : null}
                <div className='mt-4 flex justify-end gap-3'>
                  <button
                    type='button'
                    disabled={actionLoading}
                    className='rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50'
                    onClick={dismissDialog}
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    disabled={confirmDisabled}
                    className={`rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
                      actionPending === 'grant' ||
                      actionPending === 'grant_comp'
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

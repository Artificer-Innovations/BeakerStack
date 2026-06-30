import { useState } from 'react';
import { AdminDetailDrawer } from '@beakerstack/admin/web';
import {
  buildInviteUrl,
  emitLifecycleEvent,
  parseStoredProvisioningIntent,
  rejectWaitlistEntry,
  resendWaitlistInvite,
  type WaitlistEntryRow,
} from '@beakerstack/waitlist';
import {
  approveWaitlistEntryWithIntent,
  setWaitlistEntryProvisioningIntent,
  WaitlistVipInviteFields,
  type WaitlistProvisioningIntentInput,
} from '@beakerstack/waitlist-billing/web';
import { supabase } from '../../lib/supabase';
import { waitlistConfig } from '@adopter/config/waitlist';
import { waitlistBillingConfig } from '@adopter/config/waitlist-billing';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between gap-4'>
      <dt className='text-gray-500'>{label}</dt>
      <dd className='text-gray-900 font-medium'>{value}</dd>
    </div>
  );
}

function mapProvisioningError(code: string): string {
  switch (code) {
    case 'invalid_reason':
      return 'Enter a reason when granting VIP access.';
    case 'invalid_status':
      return 'VIP intent can only be saved on pending or approved entries.';
    case 'plan_not_allowed':
      return 'That VIP plan is not allowed for waitlist invites.';
    default:
      return code;
  }
}

export function AdminWaitlistDetailDrawer({
  entry,
  open,
  onClose,
  onUpdated,
}: {
  entry: WaitlistEntryRow | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [approveIntent, setApproveIntent] =
    useState<WaitlistProvisioningIntentInput | null>(null);
  const [approveIntentTouched, setApproveIntentTouched] = useState(false);
  const [approveVipEnabled, setApproveVipEnabled] = useState(false);
  const [saveIntent, setSaveIntent] =
    useState<WaitlistProvisioningIntentInput | null>(null);
  const [saveIntentTouched, setSaveIntentTouched] = useState(false);
  const [saveVipEnabled, setSaveVipEnabled] = useState(false);

  if (!entry) return null;

  const storedIntent = parseStoredProvisioningIntent(entry.metadata);
  const hasVipIntent = storedIntent?.kind === 'billing_comp';

  const sendInviteEmail = async (
    token: string,
    email: string,
    entryId: string
  ) => {
    const inviteUrl = buildInviteUrl(waitlistConfig.appOrigin, token);
    setInviteLink(inviteUrl);
    const logoUrl = `${waitlistConfig.appOrigin}/email-logo.png`;
    const html = waitlistConfig.emailTemplates.inviteHtml.replace(
      /{{logoUrl}}/g,
      logoUrl
    );
    const { data, error: fnErr } = await supabase.functions.invoke(
      waitlistConfig.opsFunctionName,
      {
        body: {
          action: 'send_invite_email',
          entryId,
          email,
          inviteUrl,
          subject: waitlistConfig.emailTemplates.inviteSubject,
          html,
        },
      }
    );
    if (fnErr) throw new Error(fnErr.message);
    const body = data as { error?: string };
    if (body?.error === 'email_not_configured') {
      throw new Error(
        'Email delivery is not configured. Copy the invite link below.'
      );
    }
    if (body?.error) throw new Error(body.error);
  };

  const handleApprove = async () => {
    if (approveVipEnabled && !approveIntent) {
      setError('Enter a reason when granting VIP access.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await approveWaitlistEntryWithIntent(
        supabase,
        waitlistBillingConfig,
        entry.id,
        approveIntentTouched ? approveIntent : undefined
      );
      if (result?.error) throw new Error(mapProvisioningError(result.error));
      if (result?.invite_token && result.email) {
        await sendInviteEmail(result.invite_token, result.email, entry.id);
        await emitLifecycleEvent('waitlist.approved', {
          email: result.email,
          entryId: entry.id,
        });
      }
      setApproveIntentTouched(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveVipIntent = async () => {
    if (saveVipEnabled && !saveIntent) {
      setError('Enter a reason when granting VIP access.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await setWaitlistEntryProvisioningIntent(
        supabase,
        waitlistBillingConfig,
        entry.id,
        saveIntentTouched ? saveIntent : null
      );
      if (result?.error) throw new Error(mapProvisioningError(result.error));
      setSaveIntentTouched(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await rejectWaitlistEntry(supabase, entry.id);
      if (result?.error) throw new Error(result.error);
      await emitLifecycleEvent('waitlist.rejected', {
        email: entry.email,
        entryId: entry.id,
      });
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await resendWaitlistInvite(supabase, entry.id);
      if (result?.error) throw new Error(result.error);
      if (result?.invite_token && result.email) {
        await sendInviteEmail(result.invite_token, result.email, entry.id);
      }
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resend failed');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
  };

  return (
    <AdminDetailDrawer open={open} title={entry.email} onClose={onClose}>
      <dl className='space-y-3 text-sm'>
        <DetailRow label='Status' value={entry.status} />
        {hasVipIntent ? <DetailRow label='VIP on signup' value='Yes' /> : null}
        <DetailRow label='Submitted' value={formatDate(entry.submitted_at)} />
        <DetailRow label='Approved' value={formatDate(entry.approved_at)} />
        <DetailRow label='Rejected' value={formatDate(entry.rejected_at)} />
        <DetailRow label='Converted' value={formatDate(entry.converted_at)} />
      </dl>

      {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
        <pre className='mt-4 text-xs bg-gray-50 p-3 rounded overflow-auto'>
          {JSON.stringify(entry.metadata, null, 2)}
        </pre>
      ) : null}

      {error ? (
        <p className='mt-4 text-sm text-red-600' role='alert'>
          {error}
        </p>
      ) : null}

      {inviteLink ? (
        <div className='mt-4 space-y-2'>
          <p className='text-xs text-gray-500 break-all'>{inviteLink}</p>
          <button
            type='button'
            className='text-sm font-medium text-indigo-600 hover:text-indigo-500'
            onClick={() => void copyLink()}
          >
            Copy invite link
          </button>
        </div>
      ) : null}

      {entry.status === 'pending' ? (
        <div className='mt-4'>
          <WaitlistVipInviteFields
            defaultCompPlanId={waitlistBillingConfig.defaultCompPlanId}
            disabled={busy}
            onChange={intent => {
              setApproveIntentTouched(true);
              setApproveIntent(intent);
            }}
            onVipEnabledChange={setApproveVipEnabled}
          />
        </div>
      ) : null}

      {entry.status === 'approved' ? (
        <div className='mt-4 space-y-3'>
          <WaitlistVipInviteFields
            defaultCompPlanId={waitlistBillingConfig.defaultCompPlanId}
            initialMetadata={entry.metadata}
            disabled={busy}
            onChange={intent => {
              setSaveIntentTouched(true);
              setSaveIntent(intent);
            }}
            onVipEnabledChange={setSaveVipEnabled}
          />
          <button
            type='button'
            disabled={busy || !saveIntentTouched}
            className='px-3 py-1.5 text-sm font-medium rounded-md border border-indigo-600 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50'
            onClick={() => void handleSaveVipIntent()}
          >
            Save VIP intent
          </button>
        </div>
      ) : null}

      <ActionsBar>
        {entry.status === 'pending' ? (
          <>
            <button
              type='button'
              disabled={busy}
              className='px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
              onClick={() => void handleApprove()}
            >
              Approve
            </button>
            <button
              type='button'
              disabled={busy}
              className='px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
              onClick={() => void handleReject()}
            >
              Reject
            </button>
          </>
        ) : null}
        {entry.status === 'approved' ? (
          <button
            type='button'
            disabled={busy}
            className='px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
            onClick={() => void handleResend()}
          >
            Resend invite
          </button>
        ) : null}
      </ActionsBar>
    </AdminDetailDrawer>
  );
}

function ActionsBar({ children }: { children: React.ReactNode }) {
  return <div className='mt-6 flex flex-wrap gap-2'>{children}</div>;
}

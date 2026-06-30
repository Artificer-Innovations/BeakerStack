import { useEffect, useState } from 'react';
import {
  buildInviteUrl,
  emitLifecycleEvent,
  getAdminWaitlistSettings,
} from '@beakerstack/waitlist';
import {
  inviteWaitlistEmailWithIntent,
  WaitlistVipInviteFields,
  type WaitlistProvisioningIntentInput,
} from '@beakerstack/waitlist-billing/web';
import { supabase } from '../../lib/supabase';
import { waitlistConfig } from '@adopter/config/waitlist';
import { waitlistBillingConfig } from '@adopter/config/waitlist-billing';

function mapInviteError(code: string): string {
  switch (code) {
    case 'invalid_email':
      return 'Enter a valid email address.';
    case 'already_converted':
      return 'This email already completed signup.';
    case 'invalid_reason':
      return 'Enter a reason when granting VIP access.';
    case 'plan_not_allowed':
      return 'That VIP plan is not allowed for waitlist invites.';
    case 'not_found':
      return 'You do not have permission to send invites.';
    default:
      return code;
  }
}

export function AdminInviteByEmailPanel({
  onInvited,
}: {
  onInvited?: () => void;
}) {
  const [signupMode, setSignupMode] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ link: string; email: string } | null>(
    null
  );
  const [provisioningIntent, setProvisioningIntent] =
    useState<WaitlistProvisioningIntentInput | null>(null);
  const [vipTouched, setVipTouched] = useState(false);
  const [vipEnabled, setVipEnabled] = useState(false);
  const [vipFormKey, setVipFormKey] = useState(0);

  useEffect(() => {
    void getAdminWaitlistSettings(supabase).then(settings => {
      setSignupMode(settings?.signup_mode ?? null);
    });
  }, []);

  const sendInviteEmail = async (
    inviteUrl: string,
    to: string,
    entryId: string
  ) => {
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
          email: to,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (vipEnabled && !provisioningIntent) {
      setError('Enter a reason when granting VIP access.');
      return;
    }

    setBusy(true);
    setError(null);
    setInvite(null);
    try {
      const result = await inviteWaitlistEmailWithIntent(
        supabase,
        waitlistBillingConfig,
        trimmed,
        {
          provisioningIntent: vipTouched ? provisioningIntent : undefined,
        }
      );
      if (result?.error) throw new Error(mapInviteError(result.error));
      if (!result?.invite_token || !result.email || !result.entry_id) {
        throw new Error('Invite was not created.');
      }

      const link = buildInviteUrl(
        waitlistConfig.appOrigin,
        result.invite_token
      );
      setInvite({ link, email: result.email });
      await sendInviteEmail(link, result.email, result.entry_id);
      await emitLifecycleEvent('waitlist.approved', {
        email: result.email,
        entryId: result.entry_id,
      });
      setEmail('');
      setProvisioningIntent(null);
      setVipTouched(false);
      setVipEnabled(false);
      setVipFormKey(k => k + 1);
      onInvited?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
  };

  const inviteOnly = signupMode === 'invite_only';

  return (
    <section
      className='rounded-lg border border-gray-200 bg-gray-50 p-4'
      aria-labelledby='admin-invite-by-email-heading'
    >
      <h3
        id='admin-invite-by-email-heading'
        className='text-sm font-semibold text-gray-900'
      >
        Invite by email
      </h3>
      <p className='mt-1 text-sm text-gray-600'>
        {inviteOnly
          ? 'Signup is invite-only. Create an invite and send the signup link without a public waitlist submission.'
          : 'Create an invite for someone who is not on the waitlist yet, or issue a new invite link for an existing entry.'}
      </p>

      <form
        className='mt-4 flex flex-col gap-3'
        onSubmit={e => void handleSubmit(e)}
      >
        <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
          <div className='flex-1'>
            <label htmlFor='admin-invite-email' className='sr-only'>
              Email address
            </label>
            <input
              id='admin-invite-email'
              type='email'
              autoComplete='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='name@example.com'
              disabled={busy}
              className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50'
            />
          </div>
          <button
            type='submit'
            disabled={busy || !email.trim()}
            className='shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50'
          >
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </div>

        <WaitlistVipInviteFields
          key={vipFormKey}
          defaultCompPlanId={waitlistBillingConfig.defaultCompPlanId}
          disabled={busy}
          onChange={intent => {
            setVipTouched(true);
            setProvisioningIntent(intent);
          }}
          onVipEnabledChange={setVipEnabled}
        />
      </form>

      {error ? (
        <p className='mt-3 text-sm text-red-600' role='alert'>
          {error}
        </p>
      ) : null}

      {invite ? (
        <div className='mt-4 space-y-2 rounded-md border border-green-200 bg-white p-3'>
          <p className='text-sm text-green-800'>
            Invite created for {invite.email}. The signup link was emailed when
            delivery is configured; you can also copy it below.
          </p>
          <p className='text-xs text-gray-500 break-all'>{invite.link}</p>
          <button
            type='button'
            className='text-sm font-medium text-indigo-600 hover:text-indigo-500'
            onClick={() => void copyLink(invite.link)}
          >
            Copy invite link
          </button>
        </div>
      ) : null}
    </section>
  );
}

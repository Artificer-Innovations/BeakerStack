import { useEffect, useState } from 'react';
import {
  buildInviteUrl,
  emitLifecycleEvent,
  getAdminWaitlistSettings,
  inviteWaitlistEmail,
} from '@beakerstack/waitlist';
import { supabase } from '../../lib/supabase';
import { beakerstackWaitlistConfig } from '../../waitlist/beakerstackWaitlistConfig';

function mapInviteError(code: string | undefined): string {
  switch (code) {
    case 'invalid_email':
      return 'Enter a valid email address.';
    case 'already_converted':
      return 'This email already completed signup.';
    case 'not_found':
      return 'You do not have permission to send invites.';
    default:
      return code ?? 'Could not create invite.';
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
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [lastEmail, setLastEmail] = useState<string | null>(null);

  useEffect(() => {
    void getAdminWaitlistSettings(supabase).then(settings => {
      setSignupMode(settings?.signup_mode ?? null);
    });
  }, []);

  const sendInviteEmail = async (inviteUrl: string, to: string) => {
    await supabase.functions.invoke(beakerstackWaitlistConfig.opsFunctionName, {
      body: {
        action: 'send_invite_email',
        email: to,
        inviteUrl,
        subject: beakerstackWaitlistConfig.emailTemplates.inviteSubject,
        html: beakerstackWaitlistConfig.emailTemplates.inviteHtml,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    setInviteLink(null);
    try {
      const result = await inviteWaitlistEmail(supabase, trimmed);
      if (result?.error) throw new Error(mapInviteError(result.error));
      if (!result?.invite_token || !result.email) {
        throw new Error('Invite was not created.');
      }

      const link = buildInviteUrl(
        beakerstackWaitlistConfig.appOrigin,
        result.invite_token
      );
      setInviteLink(link);
      setLastEmail(result.email);
      await sendInviteEmail(link, result.email);
      await emitLifecycleEvent('waitlist.approved', {
        email: result.email,
        entryId: result.entry_id,
      });
      setEmail('');
      onInvited?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
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
        className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-end'
        onSubmit={e => void handleSubmit(e)}
      >
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
      </form>

      {error ? (
        <p className='mt-3 text-sm text-red-600' role='alert'>
          {error}
        </p>
      ) : null}

      {inviteLink ? (
        <div className='mt-4 space-y-2 rounded-md border border-green-200 bg-white p-3'>
          <p className='text-sm text-green-800'>
            Invite created{lastEmail ? ` for ${lastEmail}` : ''}. The signup
            link was emailed when delivery is configured; you can also copy it
            below.
          </p>
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
    </section>
  );
}

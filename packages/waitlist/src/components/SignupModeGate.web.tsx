import type { SupabaseClient } from '@supabase/supabase-js';
import type { WaitlistConfig } from '../schema.js';
import { useSignupMode } from '../hooks/useSignupMode.js';
import { WaitlistForm } from './WaitlistForm.web.js';

export interface SignupModeGateProps {
  supabase: SupabaseClient;
  config: WaitlistConfig;
  children: React.ReactNode;
  className?: string;
}

export function SignupModeGate({
  supabase,
  config,
  children,
  className = '',
}: SignupModeGateProps) {
  const { settings, loading, isOpen, isWaitlist, isInviteOnly, isClosed } =
    useSignupMode(supabase);

  if (loading) {
    return (
      <div className={className}>
        <div className='flex justify-center py-8'>
          <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600' />
        </div>
      </div>
    );
  }

  if (isOpen) {
    return <>{children}</>;
  }

  if (isWaitlist) {
    return (
      <div className={className}>
        <WaitlistForm supabase={supabase} config={config} settings={settings} />
      </div>
    );
  }

  const inviteMessage =
    settings?.copy?.['invite_only']?.['message'] ??
    config.copy?.['invite_only']?.['message'] ??
    'Sign up is invite-only. Check your email for an invitation link.';

  const closedMessage =
    settings?.copy?.['closed']?.['message'] ??
    config.copy?.['closed']?.['message'] ??
    'Sign ups are closed right now. Please check back later.';

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <p className='text-gray-700 dark:text-gray-300'>
        {isInviteOnly
          ? inviteMessage
          : isClosed
            ? closedMessage
            : inviteMessage}
      </p>
    </div>
  );
}

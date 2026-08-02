import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { AppHeaderWithAdmin } from '../components/AppHeaderWithAdmin';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { MIN_PASSWORD_LENGTH } from '@beakerstack/shared/config/auth';
import { emitLifecycleEvent } from '@beakerstack/waitlist';
import { waitlistConfig } from '@adopter/config/waitlist';
import { billingConfig } from '@adopter/config/billing';
import { supabase } from '../lib/supabase';
import { SocialLoginButton } from '../components/SocialLoginButton';

export const INVITE_TOKEN_STORAGE_KEY = 'beakerstack_invite_token';

export function getInviteTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  return params.get('token');
}

export async function finalizeInviteSignup(
  token: string,
  userId: string,
  userEmail: string | undefined
): Promise<void> {
  const { data, error } = await supabase.functions.invoke(
    waitlistConfig.opsFunctionName,
    {
      body: {
        action: 'consume',
        token,
        userId,
        userEmail: userEmail ?? null,
        productId: billingConfig.productId,
      },
    }
  );
  if (error) throw new Error(error.message);
  const body = data as {
    error?: string;
    already_converted?: boolean;
    default_plan_id?: string;
  };
  if (body?.error) throw new Error(body.error);

  sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
  await emitLifecycleEvent('waitlist.converted', {
    email: userEmail ?? '',
    userId,
  });
}

export default function SignupInvitePage() {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const validateStarted = useRef(false);

  useEffect(() => {
    if (validateStarted.current) return;
    validateStarted.current = true;

    const t =
      getInviteTokenFromHash() ??
      sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
    if (!t) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    setToken(t);
    sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, t);

    void (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke(
        waitlistConfig.opsFunctionName,
        { body: { action: 'validate', token: t } }
      );
      if (fnErr || !(data as { valid?: boolean })?.valid) {
        setInvalid(true);
      } else {
        setInviteEmail((data as { email?: string }).email ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteEmail) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await auth.signUp(inviteEmail, password);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('Check your email to confirm your account, then sign in.');
        return;
      }
      await finalizeInviteSignup(
        token,
        session.user.id,
        session.user.email ?? inviteEmail
      );
      navigate(getAdopterConfig().postLoginPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!token) return;
    sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token);
    try {
      await auth.signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sign up with Google'
      );
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600' />
      </div>
    );
  }

  if (invalid) {
    return (
      <InvitePageShell>
        <ContentContainer className='py-12'>
          <p className='text-center text-gray-600'>
            This invite link is invalid or has expired.{' '}
            <Link to='/login' className='text-indigo-600'>
              Sign in
            </Link>
          </p>
        </ContentContainer>
      </InvitePageShell>
    );
  }

  return (
    <InvitePageShell>
      <ContentContainer className='py-12'>
        <div className='mx-auto w-full max-w-md space-y-8'>
          <div>
            <h2 className='text-center text-3xl font-extrabold text-gray-900 dark:text-white'>
              Complete your signup
            </h2>
            <p className='mt-2 text-center text-sm text-gray-600 dark:text-gray-400'>
              Use Google or set a password for your invited email.
            </p>
          </div>

          <div className='space-y-3'>
            <SocialLoginButton onPress={handleGoogle} mode='signup' />
          </div>

          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-gray-300 dark:border-gray-600' />
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='bg-gray-50 px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400'>
                Or continue with email
              </span>
            </div>
          </div>

          {error ? (
            <div className='rounded-md bg-red-50 p-4 dark:bg-red-900/30'>
              <p
                className='text-sm font-medium text-red-800 dark:text-red-300'
                role='alert'
              >
                {error}
              </p>
            </div>
          ) : null}

          <form className='space-y-6' onSubmit={e => void handleSignup(e)}>
            <div className='-space-y-px rounded-md shadow-sm'>
              <div>
                <label htmlFor='invite-email' className='sr-only'>
                  Email address
                </label>
                <input
                  id='invite-email'
                  name='email'
                  type='email'
                  autoComplete='email'
                  readOnly
                  disabled
                  value={inviteEmail ?? ''}
                  className='relative block w-full cursor-not-allowed appearance-none rounded-none rounded-t-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 placeholder-gray-500 focus:z-10 focus:border-primary-500 focus:outline-none focus:ring-primary-500 disabled:opacity-100 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200 dark:placeholder-gray-400 sm:text-sm'
                  placeholder='Email address'
                />
              </div>
              <div>
                <label htmlFor='invite-password' className='sr-only'>
                  Password
                </label>
                <input
                  id='invite-password'
                  name='password'
                  type='password'
                  autoComplete='new-password'
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={submitting}
                  className='relative block w-full appearance-none rounded-none border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-primary-500 focus:outline-none focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 sm:text-sm'
                  placeholder='Password'
                />
              </div>
              <div>
                <label htmlFor='invite-confirm-password' className='sr-only'>
                  Confirm password
                </label>
                <input
                  id='invite-confirm-password'
                  name='confirm-password'
                  type='password'
                  autoComplete='new-password'
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  className='relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-primary-500 focus:outline-none focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 sm:text-sm'
                  placeholder='Confirm password'
                />
              </div>
            </div>

            <div>
              <button
                type='submit'
                disabled={submitting}
                className='group relative flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </ContentContainer>
    </InvitePageShell>
  );
}

function InvitePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeaderWithAdmin />
      {children}
    </div>
  );
}

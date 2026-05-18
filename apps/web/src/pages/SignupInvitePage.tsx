import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { emitLifecycleEvent } from '@beakerstack/waitlist';
import { beakerstackWaitlistConfig } from '../waitlist/beakerstackWaitlistConfig';
import { beakerstackBillingConfig } from '../billing/beakerstackBillingConfig';
import { supabase, supabaseRpc } from '../lib/supabase';
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
    beakerstackWaitlistConfig.opsFunctionName,
    {
      body: {
        action: 'consume',
        token,
        userId,
        userEmail: userEmail ?? null,
      },
    }
  );
  if (error) throw new Error(error.message);
  const body = data as { error?: string; default_plan_id?: string };
  if (body?.error) throw new Error(body.error);

  const resolvedPlan =
    body.default_plan_id ??
    beakerstackBillingConfig.plans.find(p => p.priceCents === 0)?.id ??
    'beakerstack_free';

  const { error: planErr } = await supabaseRpc.rpc(
    'billing_ensure_subscription_plan',
    {
      p_product_id: beakerstackBillingConfig.productId,
      p_plan_id: resolvedPlan,
    }
  );
  if (planErr) throw new Error(planErr.message);

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
        beakerstackWaitlistConfig.opsFunctionName,
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
      navigate('/dashboard', { replace: true });
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
      <ContentContainer className='py-12 max-w-md mx-auto'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white text-center'>
          Complete your signup
        </h2>
        <p className='mt-2 text-sm text-gray-600 text-center'>
          Invited as <strong>{inviteEmail}</strong>
        </p>

        <div className='mt-6 space-y-3'>
          <SocialLoginButton onPress={handleGoogle} mode='signup' />
        </div>

        {error ? (
          <p className='mt-4 text-sm text-red-600' role='alert'>
            {error}
          </p>
        ) : null}

        <form className='mt-6 space-y-4' onSubmit={e => void handleSignup(e)}>
          <input
            type='password'
            autoComplete='new-password'
            placeholder='Password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            className='w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-600'
            required
          />
          <input
            type='password'
            autoComplete='new-password'
            placeholder='Confirm password'
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className='w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-600'
            required
          />
          <button
            type='submit'
            disabled={submitting}
            className='w-full py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50'
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </ContentContainer>
    </InvitePageShell>
  );
}

function InvitePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeader supabaseClient={supabase} />
      {children}
    </div>
  );
}

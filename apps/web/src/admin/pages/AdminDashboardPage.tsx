import { Link } from 'react-router';
import { ClipboardList, Mail, Settings, Users } from 'lucide-react';
import { useAdminOverviewStats } from '../hooks/useAdminOverviewStats';
import type { SignupMode } from '@beakerstack/waitlist';
import type {
  MarketingEmailAdminSettings,
  MarketingEmailQueueStats,
} from '@beakerstack/marketing-email';

const SIGNUP_MODE_LABELS: Record<SignupMode, string> = {
  open: 'Open',
  waitlist: 'Waitlist',
  invite_only: 'Invite only',
  closed: 'Closed',
};

function marketingEmailSubtitle(
  settings: MarketingEmailAdminSettings | null,
  stats: MarketingEmailQueueStats | null
): string {
  if (!settings) return 'Not configured';
  const parts: string[] = [settings.enabled ? 'Enabled' : 'Disabled'];
  if (stats && stats.pending > 0) parts.push(`${stats.pending} pending`);
  if (stats && stats.failed > 0) parts.push(`${stats.failed} failed`);
  return parts.join(' · ');
}

const cardClass =
  'rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-shadow';

export default function AdminOverviewPage() {
  const { usersTotal, waitlistPending, signupMode, marketingEmail, loading } =
    useAdminOverviewStats();

  const stat = (value: number | null) =>
    loading || value === null ? '—' : String(value);

  const hasFailed =
    marketingEmail?.settings != null && (marketingEmail.stats?.failed ?? 0) > 0;

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-gray-900'>Overview</h2>
        <p className='mt-1 text-sm text-gray-600'>
          Operator overview for your BeakerStack app.
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-2'>
        <Link to='/admin/users' className={cardClass}>
          <div className='flex items-center gap-3'>
            <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
              <Users className='h-5 w-5' />
            </span>
            <div>
              <p className='font-semibold text-gray-900'>Users</p>
              <p className='text-sm text-gray-500'>
                {stat(usersTotal)} total users
              </p>
            </div>
          </div>
        </Link>

        <Link to='/admin/waitlist' className={cardClass}>
          <div className='flex items-center gap-3'>
            <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
              <ClipboardList className='h-5 w-5' />
            </span>
            <div>
              <p className='font-semibold text-gray-900'>Waitlist</p>
              <p className='text-sm text-gray-500'>
                {stat(waitlistPending)} pending
              </p>
            </div>
          </div>
        </Link>

        <Link to='/admin/waitlist/settings' className={cardClass}>
          <div className='flex items-center gap-3'>
            <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
              <Settings className='h-5 w-5' />
            </span>
            <div>
              <p className='font-semibold text-gray-900'>Waitlist Settings</p>
              <p className='text-sm text-gray-500'>
                {loading || signupMode === null
                  ? '—'
                  : SIGNUP_MODE_LABELS[signupMode]}
              </p>
            </div>
          </div>
        </Link>

        <Link to='/admin/marketing-email/settings' className={cardClass}>
          <div className='flex items-center gap-3'>
            <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
              <Mail className='h-5 w-5' />
            </span>
            <div>
              <p className='font-semibold text-gray-900'>Marketing email</p>
              <p
                className={`text-sm ${hasFailed ? 'text-red-600' : 'text-gray-500'}`}
              >
                {loading
                  ? '…'
                  : marketingEmail !== null
                    ? marketingEmailSubtitle(
                        marketingEmail.settings,
                        marketingEmail.stats
                      )
                    : '—'}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

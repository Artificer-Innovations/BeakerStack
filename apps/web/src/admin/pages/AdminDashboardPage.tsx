import { Link } from 'react-router-dom';
import { ClipboardList, Settings, Users } from 'lucide-react';
import { useAdminOverviewStats } from '../hooks/useAdminOverviewStats';
import type { SignupMode } from '@beakerstack/waitlist';

const SIGNUP_MODE_LABELS: Record<SignupMode, string> = {
  open: 'Open',
  waitlist: 'Waitlist',
  invite_only: 'Invite Only',
  closed: 'Closed',
};

export default function AdminOverviewPage() {
  const { usersTotal, waitlistPending, signupMode, loading } =
    useAdminOverviewStats();

  const stat = (value: number | null) =>
    loading || value === null ? '\u2014' : String(value);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-gray-900'>Overview</h2>
        <p className='mt-1 text-sm text-gray-600'>
          Operator overview for your BeakerStack app.
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <Link
          to='/admin/users'
          className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-shadow'
        >
          <div className='flex items-center gap-3'>
            <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
              <Users className='h-5 w-5' />
            </span>
            <div>
              <p className='font-semibold text-gray-900'>Users</p>
              <p className='text-sm text-gray-500'>{stat(usersTotal)} total</p>
            </div>
          </div>
        </Link>

        <Link
          to='/admin/waitlist'
          className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-shadow'
        >
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

        <Link
          to='/admin/waitlist/settings'
          className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-shadow'
        >
          <div className='flex items-center gap-3'>
            <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
              <Settings className='h-5 w-5' />
            </span>
            <div>
              <p className='font-semibold text-gray-900'>Waitlist Settings</p>
              <p className='text-sm text-gray-500'>
                {loading || signupMode === null
                  ? '\u2014'
                  : SIGNUP_MODE_LABELS[signupMode]}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-gray-900'>Dashboard</h2>
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
              <p className='text-sm text-gray-500'>
                View signups, plans, and metered usage
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

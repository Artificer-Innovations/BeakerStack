import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@beakerstack/admin/web';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { adminNavItems } from './adminNav';
import { LayoutDashboard, LogOut } from 'lucide-react';

function breadcrumbsForPath(pathname: string) {
  const root = { label: 'Overview', to: '/admin' };
  if (pathname.includes('/waitlist/settings')) {
    return [root, { label: 'Waitlist Settings' }];
  }
  if (pathname.includes('/waitlist')) {
    return [root, { label: 'Waitlist' }];
  }
  if (pathname.includes('/users')) {
    return [root, { label: 'Users' }];
  }
  return [{ label: 'Overview' }];
}

export function AdminLayoutShell() {
  const { pathname } = useLocation();
  const breadcrumbs = useMemo(() => breadcrumbsForPath(pathname), [pathname]);
  const { signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const footerLinkClass =
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors';

  const sidebarFooter = (
    <>
      <Link to='/dashboard' className={footerLinkClass}>
        <LayoutDashboard className='h-4 w-4 shrink-0' aria-hidden />
        Dashboard
      </Link>
      <button
        type='button'
        onClick={handleSignOut}
        className={`w-full text-left ${footerLinkClass}`}
      >
        <LogOut className='h-4 w-4 shrink-0' aria-hidden />
        Sign out
      </button>
    </>
  );

  const headerRight = (
    <div className='flex items-center gap-3 md:hidden'>
      <Link
        to='/dashboard'
        className='text-sm text-gray-600 hover:text-gray-900'
      >
        Dashboard
      </Link>
      <button
        type='button'
        onClick={handleSignOut}
        className='text-sm text-gray-600 hover:text-gray-900'
      >
        Sign out
      </button>
    </div>
  );

  return (
    <AdminLayout
      navItems={adminNavItems}
      breadcrumbs={breadcrumbs}
      sidebarFooter={sidebarFooter}
      headerRight={headerRight}
    />
  );
}

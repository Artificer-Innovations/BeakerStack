import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from '@beakerstack/admin/web';
import { adminNavItems } from './adminNav';

function breadcrumbsForPath(pathname: string) {
  if (pathname.endsWith('/users')) {
    return [{ label: 'Dashboard', to: '/admin' }, { label: 'Users' }];
  }
  return [{ label: 'Dashboard' }];
}

export function AdminLayoutShell() {
  const { pathname } = useLocation();
  const breadcrumbs = useMemo(() => breadcrumbsForPath(pathname), [pathname]);

  return <AdminLayout navItems={adminNavItems} breadcrumbs={breadcrumbs} />;
}

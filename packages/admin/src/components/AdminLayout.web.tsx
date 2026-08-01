import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import type { AdminNavItem } from '../types.js';
import { AdminBreadcrumbs } from './AdminBreadcrumbs.web.js';

export type AdminLayoutProps = {
  title?: string;
  navItems: AdminNavItem[];
  breadcrumbs?: { label: string; to?: string }[];
  headerRight?: ReactNode;
  sidebarFooter?: ReactNode;
};

export function AdminLayout({
  title = 'Admin',
  navItems,
  breadcrumbs,
  headerRight,
  sidebarFooter,
}: AdminLayoutProps) {
  return (
    <div className='min-h-screen bg-gray-50 flex'>
      <aside className='hidden md:flex md:w-56 lg:w-64 flex-col border-r border-gray-200 bg-white shrink-0'>
        <div className='px-4 py-5 border-b border-gray-200'>
          <p className='text-xs font-semibold uppercase tracking-wide text-indigo-600'>
            Operator
          </p>
          <h1 className='text-lg font-semibold text-gray-900'>{title}</h1>
        </div>
        <nav
          className='flex-1 px-2 py-4 space-y-1'
          aria-label='Admin navigation'
        >
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                ].join(' ')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        {sidebarFooter != null && (
          <div
            className='px-2 py-4 border-t border-gray-200 space-y-1'
            data-testid='sidebar-footer'
          >
            {sidebarFooter}
          </div>
        )}
      </aside>
      <div className='flex-1 flex flex-col min-w-0'>
        <header className='bg-white border-b border-gray-200 px-4 sm:px-6 py-4'>
          <div className='flex items-center justify-between gap-4'>
            <AdminBreadcrumbs
              {...(breadcrumbs ? { items: breadcrumbs } : {})}
            />
            {headerRight}
          </div>
        </header>
        <main className='flex-1 p-4 sm:p-6 lg:p-8'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

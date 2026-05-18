import type { AdminNavItem } from '@beakerstack/admin';
import { LayoutDashboard, Users } from 'lucide-react';
import { createElement } from 'react';

export const adminNavItems: AdminNavItem[] = [
  {
    label: 'Dashboard',
    to: '/admin',
    icon: createElement(LayoutDashboard, { className: 'h-4 w-4 shrink-0' }),
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: createElement(Users, { className: 'h-4 w-4 shrink-0' }),
  },
];

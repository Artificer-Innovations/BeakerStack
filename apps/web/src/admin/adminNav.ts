import type { AdminNavItem } from '@beakerstack/admin';
import { ClipboardList, LayoutDashboard, Mail, Settings, Users } from 'lucide-react';
import { createElement } from 'react';

export const adminNavItems: AdminNavItem[] = [
  {
    label: 'Overview',
    to: '/admin',
    icon: createElement(LayoutDashboard, { className: 'h-4 w-4 shrink-0' }),
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: createElement(Users, { className: 'h-4 w-4 shrink-0' }),
  },
  {
    label: 'Waitlist',
    to: '/admin/waitlist',
    icon: createElement(ClipboardList, { className: 'h-4 w-4 shrink-0' }),
  },
  {
    label: 'Waitlist settings',
    to: '/admin/waitlist/settings',
    icon: createElement(Settings, { className: 'h-4 w-4 shrink-0' }),
  },
  {
    label: 'Marketing email settings',
    to: '/admin/marketing-email/settings',
    icon: createElement(Mail, { className: 'h-4 w-4 shrink-0' }),
  },
];

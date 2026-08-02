import { NavLink } from 'react-router';

const tabs: { to: string; end?: boolean; label: string }[] = [
  { to: '/billing', end: true, label: 'Overview' },
  { to: '/billing/usage', label: 'Usage' },
  { to: '/billing/plans', label: 'Plans' },
  { to: '/billing/invoices', label: 'Invoices' },
];

/**
 * Secondary nav for `/billing/*` (URL-driven active state).
 */
export function BillingTabs() {
  return (
    <nav
      className='-mb-px flex gap-0 overflow-x-auto border-b border-gray-200 dark:border-gray-700 sm:overflow-visible'
      aria-label='Billing sections'
    >
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={!!t.end}
          className={({ isActive }) =>
            [
              'shrink-0 px-4 py-3 text-sm font-medium',
              isActive
                ? 'border-b-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
            ].join(' ')
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

import type { BillingInvoiceRow } from '@beakerstack/billing';
import { Link } from 'react-router-dom';
import {
  formatDate,
  formatMoneyCents,
} from '@beakerstack/billing/presentation';
import { StatusBadge } from './StatusBadge.web';

export function InvoiceList({
  items,
  limit = 3,
  showViewAll = true,
}: {
  items: BillingInvoiceRow[];
  limit?: number;
  showViewAll?: boolean;
}): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }
  const slice = items.slice(0, limit);
  return (
    <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm'>
      <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
        Recent activity
      </h2>
      <ul className='mt-4 divide-y divide-gray-100 dark:divide-gray-700'>
        {slice.map(inv => (
          <li
            key={inv.id}
            className='flex items-center justify-between py-3 text-sm'
          >
            <div>
              <p className='text-gray-900 dark:text-white'>
                {formatDate(inv.created_at)}
              </p>
              <p className='text-gray-500 dark:text-gray-400'>
                {inv.description ?? 'Subscription'}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <StatusBadge status={inv.status} />
              <span className='text-gray-900 dark:text-white'>
                {formatMoneyCents(
                  inv.amount_paid || inv.amount_due,
                  inv.currency
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {showViewAll && items.length > 0 && (
        <div className='mt-4 text-right'>
          <Link
            to='/billing/invoices'
            className='text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300'
          >
            View all invoices →
          </Link>
        </div>
      )}
    </div>
  );
}

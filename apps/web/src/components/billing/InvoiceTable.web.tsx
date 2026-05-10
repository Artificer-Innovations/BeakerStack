import type { BillingInvoiceRow } from '@beakerstack/billing';
import { Link } from 'react-router-dom';
import { Button } from '@beakerstack/shared/components/primitives/Button.web';
import { Skeleton } from '@beakerstack/shared/components/primitives/Skeleton.web';
import { formatDate, formatMoneyCents } from '../../billing/formatters';
import { StatusBadge } from './StatusBadge.web';

export function InvoiceTable({
  items,
  loading,
  hasMore,
  onLoadMore,
  loadMorePending = false,
}: {
  items: BillingInvoiceRow[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadMorePending?: boolean;
}): JSX.Element {
  if (loading && items.length === 0) {
    return <Skeleton className='h-40 w-full rounded-lg' />;
  }
  if (!loading && items.length === 0) {
    return (
      <div className='rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm'>
        <p className='text-sm text-gray-600'>
          No invoices yet. Your invoices will appear here after your first
          payment.
        </p>
        <Link
          to='/billing/plans'
          className='mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500'
        >
          View plans
        </Link>
      </div>
    );
  }
  return (
    <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>
                Date
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>
                Description
              </th>
              <th className='px-4 py-3 text-right text-xs font-medium text-gray-500'>
                Amount
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>
                Status
              </th>
              <th className='px-4 py-3 text-right text-xs font-medium text-gray-500'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100 bg-white'>
            {items.map(inv => (
              <tr key={inv.id}>
                <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-900'>
                  {formatDate(inv.created_at)}
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>
                  {inv.description ?? '—'}
                </td>
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900'>
                  {formatMoneyCents(
                    inv.amount_paid || inv.amount_due,
                    inv.currency
                  )}
                </td>
                <td className='px-4 py-3 text-sm'>
                  <StatusBadge status={inv.status} />
                </td>
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm'>
                  {inv.hosted_invoice_url && (
                    <a
                      href={inv.hosted_invoice_url}
                      target='_blank'
                      rel='noreferrer'
                      className='mr-3 text-indigo-600 hover:text-indigo-500'
                    >
                      View
                    </a>
                  )}
                  {inv.invoice_pdf_url && (
                    <a
                      href={inv.invoice_pdf_url}
                      target='_blank'
                      rel='noreferrer'
                      className='text-indigo-600 hover:text-indigo-500'
                    >
                      PDF
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className='border-t border-gray-200 p-4 text-center'>
          <Button
            type='button'
            variant='secondary'
            onPress={onLoadMore}
            loading={loadMorePending}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

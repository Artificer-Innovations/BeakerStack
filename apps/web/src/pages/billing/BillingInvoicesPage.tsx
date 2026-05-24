import { useInvoices } from '@beakerstack/billing';
import { Link } from 'react-router-dom';
import { billingConfig } from '@adopter/config/billing';
import { BillingPageShell } from '../../components/billing/BillingPageShell.web';
import { BillingTabs } from '../../components/billing/BillingTabs.web';
import { InvoiceTable } from '../../components/billing/InvoiceTable.web';

export default function BillingInvoicesPage() {
  const { items, loading, hasMore, loadMore, error } = useInvoices<
    typeof billingConfig
  >({ pageSize: 20 });
  return (
    <BillingPageShell>
      <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
        Billing
      </h1>
      <div className='mt-4'>
        <BillingTabs />
      </div>
      <h2 className='mt-6 text-lg font-semibold text-gray-900 dark:text-white'>
        Invoices
      </h2>
      <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
        Download invoices and receipts for your records.
      </p>
      {error && (
        <p className='mt-4 text-sm text-red-600' role='alert'>
          {String(error?.message ?? error)}
        </p>
      )}
      <div className='mt-6'>
        <InvoiceTable
          items={items}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
        {!loading && items.length === 0 && (
          <p className='mt-4 text-center text-sm text-gray-500'>
            <Link
              to='/billing/plans'
              className='font-medium text-indigo-600 hover:text-indigo-500'
            >
              Explore plans
            </Link>
          </p>
        )}
      </div>
    </BillingPageShell>
  );
}

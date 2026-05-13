import { useInvoices } from '@beakerstack/billing';
import { InvoiceList } from '@beakerstack/billing/native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';

export function BillingInvoicesScreen(): ReactElement {
  const { items, loading, error, hasMore, loadMore, refresh } =
    useInvoices<typeof beakerstackBillingConfig>();

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <InvoiceList
        items={items}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadMore={loadMore}
        refresh={refresh}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
});

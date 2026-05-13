import * as WebBrowser from 'expo-web-browser';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BillingError } from '../errors.js';
import type { BillingInvoiceRow } from '../types.js';

type Props = {
  items: BillingInvoiceRow[];
  loading: boolean;
  error: BillingError | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
};

function fmt(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusColor(status: string): string {
  if (status === 'paid') return '#15803d';
  if (status === 'open') return '#d97706';
  return '#6b7280';
}

function InvoiceRow({ item }: { item: BillingInvoiceRow }): ReactElement {
  const url = item.hosted_invoice_url ?? item.invoice_pdf_url;
  const date = item.finalized_at ?? item.created_at;
  const label = fmtDate(date);

  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <Text style={s.date}>{label}</Text>
        <Text style={[s.status, { color: statusColor(item.status) }]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
      <View style={s.rowRight}>
        <Text style={s.amount}>{fmt(item.amount_due, item.currency)}</Text>
        {url ? (
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(url)}
            accessibilityLabel={`View invoice from ${label} — opens in browser`}
            accessibilityRole='button'
          >
            <Text style={s.viewLink}>View</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function InvoiceList({
  items,
  loading,
  error,
  hasMore,
  loadMore,
  refresh,
}: Props): ReactElement {
  if (loading && items.length === 0) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color='#4f46e5' />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{error.message}</Text>
        <Pressable onPress={refresh} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyTitle}>No invoices yet</Text>
        <Text style={s.emptyBody}>
          Invoices appear here once you subscribe to a paid plan.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <InvoiceRow item={item} />}
      ItemSeparatorComponent={() => <View style={s.separator} />}
      onEndReached={hasMore ? loadMore : undefined}
      onEndReachedThreshold={0.3}
      onRefresh={refresh}
      refreshing={loading}
    />
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowLeft: { gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  date: { fontSize: 14, fontWeight: '500', color: '#111827' },
  status: { fontSize: 12 },
  amount: { fontSize: 15, fontWeight: '600', color: '#111827' },
  viewLink: { fontSize: 13, color: '#4f46e5' },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  retryText: { color: '#4f46e5', fontWeight: '600' },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

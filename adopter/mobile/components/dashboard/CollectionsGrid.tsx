import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFeature } from '@beakerstack/billing';
import { billingConfig } from '@adopter/config/billing';
import type { DemoCollectionRow } from '../../billing/useDemoCollections';
import type { ActivityEntry } from './types';
import { limLabel } from './utils';

interface Props {
  collections: DemoCollectionRow[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  addCollection: () => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  onActivity?: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void;
}

export function CollectionsGrid({
  collections,
  loading,
  error,
  selectedId,
  onSelect,
  addCollection,
  deleteCollection,
  onActivity,
}: Props) {
  const { value: maxCollectionsRaw, loading: featLoading } = useFeature<
    typeof billingConfig,
    'containers_per_account_max'
  >('containers_per_account_max');

  const maxCollections =
    typeof maxCollectionsRaw === 'number' ? maxCollectionsRaw : null;
  const atCap =
    maxCollections !== null &&
    maxCollections !== -1 &&
    collections.length >= maxCollections;

  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const wrap = useCallback(async (key: string, fn: () => Promise<void>) => {
    setActionErr(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }, []);

  const handleAdd = () =>
    void wrap('add', async () => {
      await addCollection();
      onActivity?.({
        label: 'Collection added',
        rpc: 'billing_demo_add_collection',
      });
    });

  const handleDelete = (id: string) =>
    void wrap(`del:${id}`, async () => {
      await deleteCollection(id);
      onActivity?.({
        label: 'Collection deleted',
        rpc: 'billing_demo_delete_collection',
      });
    });

  return (
    <View>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Collections</Text>
          <Text style={styles.sub}>
            {loading || featLoading
              ? '…'
              : `${collections.length} of ${limLabel(maxCollections)}`}
          </Text>
        </View>
        <Pressable
          style={[
            styles.addBtn,
            (atCap || loading || featLoading || busy === 'add') &&
              styles.btnDisabled,
          ]}
          disabled={atCap || loading || featLoading || busy === 'add'}
          onPress={handleAdd}
          accessibilityLabel={
            atCap ? 'Collection limit reached for your plan' : 'New collection'
          }
        >
          <Text style={styles.addBtnText}>
            {busy === 'add'
              ? '…'
              : atCap
                ? 'Limit reached'
                : '+ New collection'}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={styles.warn} accessibilityRole='alert'>
          {error}{' '}
          <Text style={styles.warnMuted}>
            (Requires demo billing RPCs and{' '}
            <Text style={styles.mono}>demo_billing_mode</Text> in the database.)
          </Text>
        </Text>
      ) : null}

      {actionErr ? (
        <Text style={styles.err} accessibilityRole='alert'>
          {actionErr}
        </Text>
      ) : null}

      {!loading && collections.length === 0 ? (
        <Text style={styles.empty}>
          No collections yet. Tap &apos;New collection&apos; to start.
        </Text>
      ) : (
        <View style={styles.grid}>
          {collections.map(col => {
            const isSelected = col.id === selectedId;
            const delKey = `del:${col.id}`;
            return (
              <Pressable
                key={col.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => onSelect(col.id)}
                accessibilityRole='button'
                accessibilityState={{ selected: isSelected }}
              >
                <Pressable
                  style={styles.deleteBtn}
                  accessibilityLabel='Delete collection'
                  disabled={busy === delKey}
                  onPress={() => handleDelete(col.id)}
                >
                  <Text style={styles.deleteBtnText}>Del</Text>
                </Pressable>
                <Text style={styles.monoId} numberOfLines={1}>
                  {col.id.slice(0, 8)}…
                </Text>
                <Text style={styles.cardTitle}>Collection</Text>
                <Text style={styles.cardMeta}>
                  {col.item_count} item{col.item_count !== 1 ? 's' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sub: { marginTop: 2, fontSize: 11, color: '#6b7280' },
  addBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  warn: {
    marginBottom: 10,
    fontSize: 13,
    color: '#92400e',
  },
  warnMuted: { color: '#4b5563', fontSize: 12 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  err: { marginBottom: 10, fontSize: 13, color: '#dc2626' },
  empty: { fontSize: 13, color: '#6b7280' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47%',
    minWidth: 140,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 12,
    paddingTop: 36,
  },
  cardSelected: {
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 6,
    zIndex: 1,
  },
  deleteBtnText: { fontSize: 14, color: '#9ca3af' },
  monoId: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#9ca3af',
  },
  cardTitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  cardMeta: { marginTop: 2, fontSize: 11, color: '#6b7280' },
});

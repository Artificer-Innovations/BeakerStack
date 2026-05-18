import { useCallback, useEffect, useState } from 'react';
import {
  listUsers,
  type AdminListUsersResult,
  type AdminListUsersSort,
  type AdminListUsersSortDir,
} from '@beakerstack/admin';
import { supabase } from '../../lib/supabase';
import { adminProductId } from '../adminUsageColumns';

const PAGE_SIZE = 25;

export function useAdminUsers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<AdminListUsersSort>('signup');
  const [sortDir, setSortDir] = useState<AdminListUsersSortDir>('desc');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminListUsersResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers(supabase, {
        limit: PAGE_SIZE,
        offset,
        search: debouncedSearch || undefined,
        sort,
        sortDir,
        productId: adminProductId,
      });
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [offset, debouncedSearch, sort, sortDir]);

  const searchPending = search.trim() !== debouncedSearch;

  useEffect(() => {
    if (searchPending) return;
    void load();
  }, [load, searchPending]);

  const setSearchAndResetPage = useCallback((value: string) => {
    setSearch(value);
    setOffset(0);
  }, []);

  const toggleSort = useCallback(
    (column: AdminListUsersSort) => {
      setOffset(0);
      if (sort === column) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSort(column);
        setSortDir('desc');
      }
    },
    [sort]
  );

  return {
    search,
    setSearch: setSearchAndResetPage,
    sort,
    sortDir,
    toggleSort,
    offset,
    setOffset,
    pageSize: PAGE_SIZE,
    data,
    loading,
    error,
    reload: load,
  };
}

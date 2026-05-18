import { useCallback, useEffect, useState } from 'react';
import {
  listWaitlistEntries,
  type WaitlistListResult,
} from '@beakerstack/waitlist';
import { supabase } from '../../lib/supabase';

const PAGE_SIZE = 25;

export function useAdminWaitlist() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<WaitlistListResult | null>(null);
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
      const result = await listWaitlistEntries(supabase, {
        limit: PAGE_SIZE,
        offset,
        search: debouncedSearch || undefined,
        status: status || null,
      });
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [offset, debouncedSearch, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, status]);

  return {
    search,
    setSearch,
    status,
    setStatus,
    offset,
    setOffset,
    pageSize: PAGE_SIZE,
    data,
    loading,
    error,
    reload: load,
  };
}

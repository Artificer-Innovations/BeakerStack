import { useCallback, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  connectionsRequest,
  connectionsSearchUsers,
} from '../connectionsClient.js';
import { mapUnknownError } from '../errors.js';
import type { UserSearchRow } from '../schema.js';
import { ConnectionUserRow } from './ConnectionUserRow.web.js';

export type ConnectionSearchPanelProps = {
  supabase: SupabaseClient;
  onRequested?: () => void;
  className?: string;
};

export function ConnectionSearchPanel({
  supabase,
  onRequested,
  className = '',
}: ConnectionSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    setError(null);
    setSearched(true);
    try {
      const rows = await connectionsSearchUsers(supabase, q, 20);
      setResults(rows);
    } catch (e) {
      setError(mapUnknownError(e).message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [supabase, query]);

  const handleRequest = async (userId: string) => {
    setPendingId(userId);
    setError(null);
    try {
      await connectionsRequest(supabase, userId);
      onRequested?.();
      setResults(prev => prev.filter(r => r.user_id !== userId));
    } catch (e) {
      setError(mapUnknownError(e).message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className={className}>
      <label
        htmlFor='connection-search-input'
        className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
      >
        Find by username
      </label>
      <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
        Searchable profiles match by name or username. Username-only profiles
        appear only when you enter their full handle exactly (with or without
        @). Hidden profiles do not appear here.
      </p>
      <div className='flex gap-2'>
        <input
          id='connection-search-input'
          type='search'
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') void runSearch();
          }}
          placeholder='e.g. jane_doe or @jane_doe'
          className='flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm'
          autoComplete='off'
          spellCheck={false}
        />
        <button
          type='button'
          onClick={() => void runSearch()}
          disabled={searching || query.trim().length < 2}
          className='px-4 py-2 text-sm font-medium rounded-md bg-primary-600 text-white disabled:opacity-50'
        >
          {searching ? '…' : 'Search'}
        </button>
      </div>
      {error && (
        <p className='mt-2 text-sm text-red-600 dark:text-red-400' role='alert'>
          {error}
        </p>
      )}
      <div className='mt-4'>
        {searched && !searching && results.length === 0 && !error && (
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            No one matched. Check spelling, or ask for their exact username if
            they are not discoverable in search.
          </p>
        )}
        {results.map(row => (
          <ConnectionUserRow
            key={row.user_id}
            username={row.username}
            displayName={row.display_name}
            avatarUrl={row.avatar_url}
            actions={
              <button
                type='button'
                disabled={pendingId === row.user_id}
                onClick={() => void handleRequest(row.user_id)}
                className='px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
              >
                Connect
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}

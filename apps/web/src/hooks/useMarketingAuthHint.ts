import { useEffect, useState } from 'react';
import {
  getLikelyAuthenticated,
  getSupabaseAuthStorageKey,
} from '../lib/authStorageHint';

/**
 * Sync localStorage hint for marketing CTAs. Updates on cross-tab storage events
 * for the Supabase auth key only (same-tab navigation remounts fresh routes).
 */
export function useMarketingAuthHint(): boolean {
  const [hint, setHint] = useState(() =>
    typeof window === 'undefined' ? false : getLikelyAuthenticated()
  );

  useEffect(() => {
    const storageKey = getSupabaseAuthStorageKey();
    const sync = () => setHint(getLikelyAuthenticated());

    const onStorage = (e: StorageEvent) => {
      if (storageKey == null || e.key === storageKey || e.key === null) {
        sync();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return hint;
}

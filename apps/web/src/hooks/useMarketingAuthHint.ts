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
  // `getLikelyAuthenticated()` already returns false when `window` is undefined,
  // so we can use it directly as the lazy initializer.
  const [hint, setHint] = useState(getLikelyAuthenticated);

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

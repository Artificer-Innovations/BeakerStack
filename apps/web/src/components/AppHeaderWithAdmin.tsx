import { useEffect } from 'react';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { useIsAdmin } from '@beakerstack/admin';
import { supabase } from '../lib/supabase';

/**
 * AppHeader wired with admin check. Renders the Admin menu item when the
 * current user is an active admin; hides it while loading or on RPC error
 * (fail-closed). Rechecks on window focus / tab visibility change, matching
 * AdminRoute behaviour so revoked access is surfaced without a sign-out.
 */
export function AppHeaderWithAdmin() {
  const auth = useAuthContext();
  const { isAdmin, loading, refresh } = useIsAdmin(supabase, auth.user?.id);

  useEffect(() => {
    if (!auth.user?.id) return;

    const recheck = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [auth.user?.id, refresh]);

  return (
    <AppHeader supabaseClient={supabase} showAdminLink={!loading && isAdmin} />
  );
}

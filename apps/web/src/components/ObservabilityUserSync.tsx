import { useEffect } from 'react';
import { useObservability } from '@beakerstack/observability/web';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';

/** Syncs the Supabase user id to Sentry (hashed) when session changes. */
export function ObservabilityUserSync() {
  const { user } = useAuthContext();
  const obs = useObservability();

  useEffect(() => {
    obs.setUser(user?.id ?? null);
  }, [obs, user?.id]);

  return null;
}

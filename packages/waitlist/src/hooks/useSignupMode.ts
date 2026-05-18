import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicWaitlistSettings } from '../waitlistClient.js';
import type { SignupMode, WaitlistPublicSettings } from '../types.js';

export interface UseSignupModeResult {
  mode: SignupMode;
  settings: WaitlistPublicSettings | null;
  loading: boolean;
  isOpen: boolean;
  isWaitlist: boolean;
  isInviteOnly: boolean;
  isClosed: boolean;
}

export function useSignupMode(supabase: SupabaseClient): UseSignupModeResult {
  const [settings, setSettings] = useState<WaitlistPublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await getPublicWaitlistSettings(supabase);
      if (!cancelled) {
        setSettings(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const mode: SignupMode = settings?.signup_mode ?? 'open';

  return {
    mode,
    settings,
    loading,
    isOpen: mode === 'open',
    isWaitlist: mode === 'waitlist',
    isInviteOnly: mode === 'invite_only',
    isClosed: mode === 'closed',
  };
}

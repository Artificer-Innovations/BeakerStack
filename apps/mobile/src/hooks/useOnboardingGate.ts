import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface OnboardingGateResult {
  showOnboarding: boolean;
  loading: boolean;
  markComplete: () => Promise<void>;
}

export function useOnboardingGate(userId: string | null): OnboardingGateResult {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const enabled = process.env.EXPO_PUBLIC_ONBOARDING_ENABLED !== 'false';
    if (!enabled) {
      setLoading(false);
      return;
    }

    supabase
      .from('onboarding_steps')
      .select('step_key')
      .eq('user_id', userId)
      .eq('step_key', 'carousel_completed')
      .maybeSingle()
      .then(({ data, error }) => {
        setShowOnboarding(!error && !data);
        setLoading(false);
      })
      .catch(() => {
        // Fail-open: network error → don't show carousel, clear loading
        setShowOnboarding(false);
        setLoading(false);
      });
  }, [userId]);

  const markComplete = async () => {
    if (!userId) return;
    await supabase.from('onboarding_steps').upsert(
      { user_id: userId, step_key: 'carousel_completed', completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,step_key' }
    );
    setShowOnboarding(false);
  };

  return { showOnboarding, loading, markComplete };
}

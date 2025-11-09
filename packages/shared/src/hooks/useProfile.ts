import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SupabaseClient,
  User,
  RealtimeChannel,
} from '@supabase/supabase-js';
import type {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
} from '../types/profile';
import type { TablesInsert } from '../types/database';
import { Logger } from '../utils/logger';

export interface ProfileHookReturn {
  supabaseClient: SupabaseClient;
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  fetchProfile: (userId: string) => Promise<void>;
  createProfile: (
    userId: string,
    data: UserProfileInsert
  ) => Promise<UserProfile>;
  updateProfile: (
    userId: string,
    data: UserProfileUpdate
  ) => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
}

// ============================================================================
// Singleton Realtime Registry
// ============================================================================
// This ensures only ONE channel per userId exists globally, shared across all
// hook instances. Each hook adds/removes its listener; the channel is only
// unsubscribed when the last listener is removed.

type RealtimeListener = (profile: UserProfile | null) => void;

interface ChannelEntry {
  channel: RealtimeChannel;
  listeners: Set<RealtimeListener>;
}

class ProfileRealtimeRegistry {
  private channels = new Map<string, ChannelEntry>();

  subscribe(
    supabaseClient: SupabaseClient,
    userId: string,
    listener: RealtimeListener
  ): () => void {
    let entry = this.channels.get(userId);

    if (!entry) {
      Logger.debug(
        '[ProfileRealtimeRegistry] Creating new channel for user:',
        userId
      );

      const channel = supabaseClient
        .channel(`profile:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
            filter: `user_id=eq.${userId}`,
          },
          payload => {
            Logger.debug(
              '[ProfileRealtimeRegistry] Received realtime update:',
              payload
            );

            const entry = this.channels.get(userId);
            if (!entry) return;

            let newProfile: UserProfile | null = null;
            if (
              payload.eventType === 'INSERT' ||
              payload.eventType === 'UPDATE'
            ) {
              newProfile = payload.new as UserProfile;
              Logger.debug(
                '[ProfileRealtimeRegistry] Broadcasting update to',
                entry.listeners.size,
                'listeners'
              );
            } else if (payload.eventType === 'DELETE') {
              Logger.debug(
                '[ProfileRealtimeRegistry] Broadcasting delete to',
                entry.listeners.size,
                'listeners'
              );
            }

            // Fan-out to all listeners
            entry.listeners.forEach(fn => fn(newProfile));
          }
        )
        .subscribe(status => {
          Logger.debug(
            '[ProfileRealtimeRegistry] Channel status for user',
            userId,
            ':',
            status
          );
        });

      entry = { channel, listeners: new Set() };
      this.channels.set(userId, entry);
    }

    // Add this listener
    entry.listeners.add(listener);
    Logger.debug(
      '[ProfileRealtimeRegistry] Added listener for user',
      userId,
      '(total:',
      entry.listeners.size,
      ')'
    );

    // Return unsubscribe function
    return () => {
      const entry = this.channels.get(userId);
      if (!entry) return;

      entry.listeners.delete(listener);
      Logger.debug(
        '[ProfileRealtimeRegistry] Removed listener for user',
        userId,
        '(remaining:',
        entry.listeners.size,
        ')'
      );

      // If no listeners remain, tear down the channel
      if (entry.listeners.size === 0) {
        Logger.debug(
          '[ProfileRealtimeRegistry] No listeners remain, unsubscribing channel for user:',
          userId
        );
        // Check if unsubscribe exists before calling it
        if (typeof entry.channel.unsubscribe === 'function') {
          entry.channel.unsubscribe().catch(err => {
            Logger.warn(
              '[ProfileRealtimeRegistry] Channel unsubscribe error:',
              err
            );
          });
        } else {
          Logger.warn(
            '[ProfileRealtimeRegistry] Channel does not have unsubscribe method'
          );
        }
        this.channels.delete(userId);
      }
    };
  }
}

const realtimeRegistry = new ProfileRealtimeRegistry();

export function useProfile(
  supabaseClient: SupabaseClient,
  user: User | null
): ProfileHookReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(
    async (userId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabaseClient
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          // Profile not found is not necessarily an error - it just means they haven't created one yet
          if (fetchError.code === 'PGRST116') {
            setProfile(null);
            setError(null);
          } else {
            const errorObj = new Error(fetchError.message);
            setError(errorObj);
            throw errorObj;
          }
        } else {
          setProfile(data);
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setLoading(false);
      }
    },
    [supabaseClient]
  );

  const supabaseClientRef = useRef(supabaseClient);

  useEffect(() => {
    supabaseClientRef.current = supabaseClient;
  }, [supabaseClient]);

  // Auto-fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile(user.id).catch(err => {
        // Error is already set in state by fetchProfile
        // Catch here to prevent unhandled promise rejection
        Logger.error('[useProfile] Initial fetchProfile call failed:', err);
      });
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, fetchProfile]);

  // Subscribe to realtime updates using the singleton registry
  useEffect(() => {
    if (!user) {
      return;
    }

    Logger.debug(
      '[useProfile] Subscribing to realtime updates for user:',
      user.id
    );

    // Create a stable listener callback
    const listener = (newProfile: UserProfile | null) => {
      Logger.debug('[useProfile] Received profile update from registry');
      setProfile(newProfile);
    };

    // Subscribe via the registry
    const client = supabaseClientRef.current;
    const userId = user.id;
    const unsubscribe = realtimeRegistry.subscribe(client, userId, listener);

    // Cleanup: only removes this hook's listener
    return () => {
      Logger.debug('[useProfile] Unsubscribing listener for user:', userId);
      unsubscribe();
    };
  }, [user?.id]);

  const createProfile = async (
    userId: string,
    data: UserProfileInsert
  ): Promise<UserProfile> => {
    setLoading(true);
    setError(null);

    try {
      const profileData: TablesInsert<'user_profiles'> = {
        ...data,
        user_id: userId,
      };

      const { data: createdProfile, error: createError } = await supabaseClient
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (createError) {
        const errorObj = new Error(createError.message);
        setError(errorObj);
        throw errorObj;
      }

      setProfile(createdProfile);
      return createdProfile;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (
    userId: string,
    data: UserProfileUpdate
  ): Promise<UserProfile> => {
    setLoading(true);
    setError(null);

    try {
      Logger.debug(
        '[useProfile] updateProfile called with userId:',
        userId,
        'data:',
        data
      );
      const { data: updatedProfile, error: updateError } = await supabaseClient
        .from('user_profiles')
        .update(data)
        .eq('user_id', userId)
        .select()
        .single();

      Logger.debug(
        '[useProfile] Update response - data:',
        updatedProfile,
        'error:',
        updateError
      );

      if (updateError) {
        Logger.error('[useProfile] Update error:', updateError);
        const errorObj = new Error(updateError.message);
        setError(errorObj);
        throw errorObj;
      }

      if (!updatedProfile) {
        Logger.error('[useProfile] Update returned null data');
        const errorObj = new Error(
          'Update succeeded but returned no profile data'
        );
        setError(errorObj);
        throw errorObj;
      }

      Logger.debug(
        '[useProfile] Update successful, new profile:',
        updatedProfile
      );
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      Logger.error('[useProfile] Update caught error:', err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return {
    supabaseClient,
    currentUser: user,
    profile,
    loading,
    error,
    fetchProfile,
    createProfile,
    updateProfile,
    refreshProfile,
  };
}

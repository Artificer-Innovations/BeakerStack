import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile, UserProfileInsert, UserProfileUpdate } from '../types/profile';
import type { TablesInsert } from '../types/database';

export interface ProfileHookReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  fetchProfile: (userId: string) => Promise<void>;
  createProfile: (userId: string, data: UserProfileInsert) => Promise<UserProfile>;
  updateProfile: (userId: string, data: UserProfileUpdate) => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
}

export function useProfile(supabaseClient: SupabaseClient, user: User | null): ProfileHookReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
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
  }, [supabaseClient]);

  // Auto-fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, fetchProfile]);

  const createProfile = async (userId: string, data: UserProfileInsert): Promise<UserProfile> => {
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

  const updateProfile = async (userId: string, data: UserProfileUpdate): Promise<UserProfile> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useProfile] updateProfile called with userId:', userId, 'data:', data);
      const { data: updatedProfile, error: updateError } = await supabaseClient
        .from('user_profiles')
        .update(data)
        .eq('user_id', userId)
        .select()
        .single();

      console.log('[useProfile] Update response - data:', updatedProfile, 'error:', updateError);

      if (updateError) {
        console.error('[useProfile] Update error:', updateError);
        const errorObj = new Error(updateError.message);
        setError(errorObj);
        throw errorObj;
      }

      if (!updatedProfile) {
        console.error('[useProfile] Update returned null data');
        const errorObj = new Error('Update succeeded but returned no profile data');
        setError(errorObj);
        throw errorObj;
      }

      console.log('[useProfile] Update successful, new profile:', updatedProfile);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('[useProfile] Update caught error:', err);
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
    profile,
    loading,
    error,
    fetchProfile,
    createProfile,
    updateProfile,
    refreshProfile,
  };
}


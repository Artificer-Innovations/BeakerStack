import type { Tables, TablesInsert, TablesUpdate } from './database';

// Profile type based on the database schema
export type UserProfile = Tables<'user_profiles'>;

// Profile insert type (for creating new profiles)
// Note: user_id is provided by the hook, so it's omitted here
export type UserProfileInsert = Omit<TablesInsert<'user_profiles'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

// Profile update type (for updating existing profiles)
export type UserProfileUpdate = Omit<TablesUpdate<'user_profiles'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

